import { URL } from "url";

import { CollectionReference } from "@google-cloud/firestore";
import { firestore } from "firebase-admin";

import { SendInviteApiEndpoint } from "@raha/api-shared/dist/routes/me/definitions";
import { InviterMustBeInvitedError } from "@raha/api-shared/dist/errors/RahaApiError/me/sendInvite/InviterMustBeInvited";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { OperationType } from "@raha/api-shared/dist/models/Operation";

import { createApiRoute, OperationToInsert } from "..";
import { Config } from "../../config/config";

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

export const sendInvite = (
  config: Config,
  sgMail: { send: (message: EmailMessage) => void },
  members: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<SendInviteApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInMemberId = loggedInMemberToken.uid;
    const loggedInMember = await members.doc(loggedInMemberId).get();

    const { inviteEmail, videoToken, isJointVideo } = call.body;

    if (!loggedInMember.exists) {
      throw new InviterMustBeInvitedError();
    }

    const requiredParams = {
      inviteEmail,
      videoToken,
      isJointVideo
    };
    const missingParams = (Object.keys(requiredParams) as Array<
      keyof typeof requiredParams
    >).filter(key => requiredParams[key] === undefined);
    if (missingParams.length !== 0) {
      throw new MissingParamsError(missingParams);
    }

    // TODO generate this server side somewhere.
    const inviteToken = videoToken;

    const newInvite: OperationToInsert = {
      creator_uid: loggedInMemberId,
      op_code: OperationType.INVITE,
      created_at: firestore.FieldValue.serverTimestamp(),
      data: {
        invite_token: inviteToken,
        is_joint_video: isJointVideo,
        video_token: inviteToken
      }
    };
    await operations.doc().create(newInvite);

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
