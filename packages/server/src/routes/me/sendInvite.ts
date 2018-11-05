import { URL } from "url";

import { CollectionReference } from "@google-cloud/firestore";
import { firestore } from "firebase-admin";

import { SendInviteApiEndpoint } from "@raha/api-shared/dist/routes/me/definitions";
import { InviterMustBeInvitedError } from "@raha/api-shared/dist/errors/RahaApiError/me/sendInvite/InviterMustBeInvited";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { OperationType } from "@raha/api-shared/dist/models/Operation";

import { createApiRoute, OperationToInsert } from "..";
import { Config } from "../../config/config";
import { validateAbilityToCreateOperation } from "../../helpers/abilities";
import {
  VideoReference,
  MediaReferenceKind
} from "@raha/api-shared/dist/models/MediaReference";
import { generateId } from "../../helpers/id";
import {
  movePrivateVideoToPublicInviteVideo,
  movePrivateInviteVideoToPublicBucket,
  videoPaths,
  getPublicUrlForPath,
  BucketStorage
} from "../../helpers/legacyVideoMethods";

interface DynamicTemplateData {
  inviter_fullname: string;
  invite_link: string;
  invite_token: string;
  // TODO: Re-enable once videos are publicly readable and SendGrid template uncommented.
  // invite_video_url: string;
  // invite_video_thumbnail: string;
}

interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  dynamic_template_data: DynamicTemplateData;
  template_id: string;
}

function createVideoReference(
  content: VideoReference["content"]
): VideoReference {
  return {
    id: generateId(),
    content
  };
}

async function LEGACY_createVideoReference(
  config: Config,
  storage: BucketStorage,
  body: SendInviteApiEndpoint["call"]["request"]["body"]
): Promise<VideoReference> {
  if ("videoReference" in body) {
    // technically, this breaks backwards compatibility since we're not copying
    // the new video location to the old one; but the only people who would
    // experience this is people who are joining Raha but already somehow have
    // an outdated version of the app installed. Pretty unlikely, so not
    // worrying about copying the video over; failure case is that the invite
    // video doesn't show up when signing up.
    return createVideoReference(body.videoReference);
  }

  // then we will see if this is a legacy request.
  const legacyBody: {
    videoToken: string;
  } = body;

  if (!("videoToken" in legacyBody) || !legacyBody.videoToken) {
    throw new Error(
      "Unexpected: could not retrieve video reference from send invite API call."
    );
  }

  const newVideoReferenceId = generateId();

  // we assume this is a legacy request.
  await movePrivateInviteVideoToPublicBucket({
    config,
    storage,
    newVideoReferenceId,
    privateVideoToken: legacyBody.videoToken, // old behavior was that invite token is video token
    removeOriginal: false
  });

  const paths = videoPaths(newVideoReferenceId);

  return {
    id: newVideoReferenceId,
    content: {
      kind: MediaReferenceKind.VIDEO,
      url: getPublicUrlForPath(config, paths.video),
      thumbnailUrl: getPublicUrlForPath(config, paths.thumbnail)
    }
  };
}

export const sendInvite = ({
  config,
  storage,
  sgMail,
  membersCollection,
  operationsCollection
}: {
  config: Config;
  storage: BucketStorage;
  sgMail: { send: (message: EmailMessage) => void };
  membersCollection: CollectionReference;
  operationsCollection: CollectionReference;
}) =>
  createApiRoute<SendInviteApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInMemberId = loggedInMemberToken.uid;
    const loggedInMember = await membersCollection.doc(loggedInMemberId).get();

    await validateAbilityToCreateOperation(
      OperationType.INVITE,
      operationsCollection,
      undefined,
      loggedInMember
    );

    const { inviteEmail, isJointVideo } = call.body;

    if (!loggedInMember.exists) {
      throw new InviterMustBeInvitedError();
    }

    // TODO: once legacy code above is removed, check for videoReference too
    const requiredParams = {
      inviteEmail,
      // videoReference,
      isJointVideo
    };
    const missingParams = (Object.keys(requiredParams) as Array<
      keyof typeof requiredParams
    >).filter(key => requiredParams[key] === undefined);
    if (missingParams.length !== 0) {
      throw new MissingParamsError(missingParams);
    }

    // TODO: replace with just createVideoReference once legacy support dropped
    // const videoReference = createVideoReference(call.body.videoReference);
    const videoReference = await LEGACY_createVideoReference(
      config,
      storage,
      call.body
    );
    // separate ID to avoid temptation to address invites by videos/vice versa
    const inviteToken = generateId();

    const newInvite: OperationToInsert = {
      creator_uid: loggedInMemberId,
      op_code: OperationType.INVITE,
      created_at: firestore.FieldValue.serverTimestamp(),
      data: {
        invite_token: inviteToken,
        is_joint_video: isJointVideo,
        video_token: videoReference.id,
        videoReference
      }
    };
    await operationsCollection.doc().create(newInvite);

    const loggedInFullName = loggedInMember.get("full_name");

    // Deeplink invite url.
    const inviteLink = new URL(
      `/invite?t=${inviteToken}`,
      `https://to.raha.app`
    ).toString();

    const msg = {
      to: inviteEmail,
      from: "invites@raha.app",
      subject: `${loggedInFullName} invited you to join Raha!`,
      dynamic_template_data: {
        inviter_fullname: `${loggedInFullName}`,
        invite_link: `${inviteLink}`,
        invite_token: `${inviteToken}`
      },
      template_id: "d-9b939b9d11d74d1bb25901acc4517f49"
    };
    sgMail.send(msg);

    return {
      status: 201,
      body: {
        message: "Invite succesfully sent!"
      }
    };
  });
