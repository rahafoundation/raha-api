import * as crypto from "crypto";
import * as httpStatus from "http-status";
import { URL } from "url";

import { CollectionReference, Firestore } from "@google-cloud/firestore";
import * as Storage from "@google-cloud/storage";
import * as asyncBusboy from "async-busboy";
import Big from "big.js";
import * as coconut from "coconutjs";
import { firestore, storage as adminStorage } from "firebase-admin";
import { Context } from "koa";

import {
  Operation,
  OperationToBeCreated,
  OperationType
} from "@raha/api-shared/dist/models/Operation";
import {
  GiveApiEndpoint,
  WebRequestInviteApiEndpoint,
  TrustMemberApiEndpoint,
  CreateMemberApiEndpoint,
  VerifyMemberApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";
import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";
import { AlreadyRequestedError } from "@raha/api-shared/dist/errors/RahaApiError/members/requestInvite/AlreadyRequestedError";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { AlreadyTrustedError } from "@raha/api-shared/dist/errors/RahaApiError/members/trust/AlreadyTrustedError";
import { InsufficientBalanceError } from "@raha/api-shared/dist/errors/RahaApiError/members/give/InsufficientBalanceError";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { InvalidInviteTokenError } from "@raha/api-shared/dist/errors/RahaApiError/members/createMember/InvalidInviteToken";
import { InvalidInviteOperationError } from "@raha/api-shared/dist/errors/RahaApiError/members/createMember/InvalidInviteOperation";

import { createApiRoute } from "..";
import { Config } from "../../config/prod.config";
import { Readable as ReadableStream } from "stream";
import { getMemberById } from "../../collections/members";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";

type OperationToInsert = OperationToBeCreated & {
  created_at: firestore.FieldValue;
};

const TEN_MINUTES = 1000 * 60 * 10;
const DEFAULT_DONATION_RECIPIENT_UID = "RAHA";
const DEFAULT_DONATION_RATE = 0.03;

type BucketStorage = adminStorage.Storage | Storage.Storage;

/**
 * This function is specifically used by the web-invite flow to locate files
 * that are restricted to uploading-user-only access. These videos must be
 * scrubbed by Coconut before being accessed by anyone else.
 */
function getPrivateUserOnlyVideoRef(
  config: Config,
  storage: BucketStorage,
  memberUid: string
): Storage.File {
  // TODO: this is a quick hack to make the types work out because test and prod
  // use different storage backends; see the corresponding TODO in app.ts
  return (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${memberUid}/invite.mp4`);
}

function getPublicVideoBucketRef(config: Config, storage: BucketStorage) {
  return (storage as Storage.Storage).bucket(config.publicVideoBucket);
}

function getPublicInviteVideoRef(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(`${uid}/invite.mp4`);
}

function getPublicInviteVideoThumbnailRef(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(
    `${uid}/invite.mp4.thumb.jpg`
  );
}

async function createCoconutVideoEncodingJob(
  config: Config,
  storage: BucketStorage,
  coconutApiKey: string,
  memberUid: string
) {
  const videoRef = getPrivateUserOnlyVideoRef(config, storage, memberUid);

  const temporaryAccessUrl = (await videoRef.getSignedUrl({
    action: "read",
    expires: Date.now() + TEN_MINUTES
  }))[0];

  const webhookUrl = new URL(
    `members/${memberUid}/notify_video_encoded`,
    config.apiBase
  );
  const uploadUrl = new URL(
    `members/${memberUid}/upload_video`,
    config.apiBase
  );

  coconut.createJob(
    {
      api_key: coconutApiKey,
      source: temporaryAccessUrl,
      webhook: webhookUrl.toString(),
      outputs: {
        mp4: uploadUrl.toString()
      }
    },
    (job: any) => {
      if (job.status === "ok") {
        // tslint:disable-next-line:no-console
        console.log("Coconut encoding job created successfully.");
        // tslint:disable-next-line:no-console
        console.log(job.id);
      } else {
        // tslint:disable-next-line:no-console
        console.error("Coconut encoding job error", job.error_code);
        // tslint:disable-next-line:no-console
        console.error(job.error_message);
      }
    }
  );
}

function getPublicUrlForMemberAndToken(
  config: Config,
  memberUid: string,
  videoToken: string
) {
  return `https://storage.googleapis.com/${
    config.publicVideoBucket
  }/${memberUid}/${videoToken}/video.mp4`;
}

function getPublicInviteVideoUrlForMember(config: Config, memberUid: string) {
  return `https://storage.googleapis.com/${
    config.publicVideoBucket
  }/${memberUid}/invite.mp4`;
}

/**
 * Expects the video to be at /private-video/<videoToken>/video.mp4.
 * Video is moved to /<publicBucket>/<memberUid>/<videoToken>/video.mp4.
 * TODO: Remove all other video handling functions. This should be all that we need.
 */
async function movePrivateVideoToPublicVideo(
  config: Config,
  storage: BucketStorage,
  memberUid: string,
  videoToken: string,
  removeOriginal: boolean
) {
  const newVideoPath = `${memberUid}/${videoToken}/video.mp4`;
  const publicVideoBucket = (storage as Storage.Storage).bucket(
    config.publicVideoBucket
  );
  const publicVideoRef = publicVideoBucket.file(newVideoPath);
  const publicThumbnailRef = publicVideoBucket.file(
    `${newVideoPath}.thumb.jpg`
  );

  if ((await publicVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  const privateVideoPath = `private-video/${videoToken}`;
  const privateVideoBucket = (storage as Storage.Storage).bucket(
    config.privateVideoBucket
  );
  const privateVideoRef = privateVideoBucket.file(
    `${privateVideoPath}/video.mp4`
  );
  const privateVideoThumbnailRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`${privateVideoPath}/thumbnail.jpg`);

  if (!(await privateVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Private video does not exist at expected location. Cannot move.",
      {}
    );
  }

  await (removeOriginal
    ? Promise.all([
        privateVideoRef.move(publicVideoRef),
        privateVideoThumbnailRef.move(publicThumbnailRef)
      ])
    : Promise.all([
        privateVideoRef.copy(publicVideoRef),
        privateVideoThumbnailRef.copy(publicThumbnailRef)
      ]));

  return publicVideoRef;
}

/**
 * Expects the video to be at /private-video/<videoToken>/video.mp4.
 * Video is moved to /<publicBucket>/<memberUid>/invite.mp4.
 * TODO: Remove this once all invite videos have been moved to tokenized locations
 * and tokens recorded on operations/members.
 */
async function movePrivateVideoToPublicInviteVideo(
  config: Config,
  storage: BucketStorage,
  memberUid: string,
  videoToken: string,
  removeOriginal: boolean
) {
  const publicVideoRef = getPublicInviteVideoRef(config, storage, memberUid);
  const publicThumbnailRef = getPublicInviteVideoThumbnailRef(
    config,
    storage,
    memberUid
  );

  if (
    (await Promise.all([
      publicVideoRef.exists(),
      publicThumbnailRef.exists()
    ])).find(x => x[0])
  ) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  const privateVideoRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${videoToken}/video.mp4`);

  const privateThumbnailRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${videoToken}/thumbnail.jpg`);

  if (
    (await Promise.all([
      privateVideoRef.exists(),
      privateThumbnailRef.exists()
    ])).find(x => !x[0])
  ) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Private video does not exist at expected location. Cannot move.",
      {}
    );
  }

  await (removeOriginal
    ? Promise.all([
        privateVideoRef.move(publicVideoRef),
        privateThumbnailRef.move(publicThumbnailRef)
      ])
    : Promise.all([
        privateVideoRef.copy(publicVideoRef),
        privateThumbnailRef.copy(publicThumbnailRef)
      ]));

  return publicVideoRef;
}

/**
 * Reads the entire stream of video data into a Buffer.
 * @param videoStream stream of video data.
 */
function getVideoBufferFromStream(
  videoStream: ReadableStream
): Promise<Buffer> {
  const buffers: Buffer[] = [];
  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    videoStream.on("data", (data: Buffer) => {
      buffers.push(data);
    });
    videoStream.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
  videoStream.resume();
  return bufferPromise;
}

/**
 * Calculate the hex-encoded sha256 hash of the video.
 * @param videoBuffer Buffer of video data.
 */
function getHashFromVideoBuffer(videoBuffer: Buffer): string {
  const hash = crypto.createHash("sha256");
  hash.update(videoBuffer);
  return hash.digest("hex");
}

/**
 * Endpoint coconut calls to notify an uploaded video has been successfully
 * encoded. Not intended to be called by a user, so doesn't go through the
 * `createApiRoute` flow.
 */
export const notifyVideoEncoded = (ctx: Context) => {
  ctx.status = 200;
};

/**
 * Endpoint to upload a user's invite video.
 * Doesn't go through the `createApiRoute` flow.
 *
 * TODO: should it use `createApiRoute` and have documented types?
 * TODO: if do above, should also use the RahaApiError class for structured response
 */
export const uploadVideo = (
  config: Config,
  storage: BucketStorage,
  uidToVideoHash: CollectionReference
) => async (ctx: Context) => {
  const videoForUid = ctx.params.memberId;

  const publicVideoRef = getPublicInviteVideoRef(config, storage, videoForUid);
  if ((await publicVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  const reqType = ctx.request.type;
  if (reqType !== "multipart/form-data") {
    ctx.status = 400;
    ctx.body = "Must submit data as multipart/form-data";
    return;
  }

  const { files } = await asyncBusboy(ctx.req);
  const encodedVideo = files.filter(
    (file: any) => file.fieldname === "encoded_video"
  );
  if (encodedVideo.length !== 1) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Zero or multiple encoded videos supplied with request.",
      {}
    );
  }

  const videoBuf = await getVideoBufferFromStream(encodedVideo[0]);
  const hash = getHashFromVideoBuffer(videoBuf);

  const hashMappingRef = uidToVideoHash.doc(videoForUid);
  if ((await hashMappingRef.get()).exists) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Invite video already exists for specified user.",
      {}
    );
  }
  await hashMappingRef.create({
    hash
  });

  await publicVideoRef.save(videoBuf);

  const privateVideoRef = getPrivateUserOnlyVideoRef(
    config,
    storage,
    videoForUid
  );
  if ((await privateVideoRef.exists())[0]) {
    await privateVideoRef.delete();
  } else {
    // tslint:disable-next-line:no-console
    console.warn("We expected a private video file to exist that did not.");
  }

  ctx.status = 201;
};

export const webRequestInvite = (
  config: Config,
  storage: BucketStorage,
  coconutApiKey: string,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
) =>
  createApiRoute<WebRequestInviteApiEndpoint>(
    async (call, loggedInMemberToken) => {
      const loggedInUid = loggedInMemberToken.uid;
      const loggedInMemberRef = membersCollection.doc(loggedInUid);

      if ((await loggedInMemberRef.get()).exists) {
        throw new AlreadyRequestedError();
      }

      const { username, fullName } = call.body;
      const requestingFromId = call.params.memberId;
      const requestingFromMember = await getMemberById(
        membersCollection,
        requestingFromId
      );
      if (!requestingFromMember) {
        throw new NotFoundError(requestingFromId);
      }

      const newOperation: OperationToInsert = {
        creator_uid: loggedInUid,
        op_code: OperationType.REQUEST_INVITE,
        data: {
          username,
          full_name: fullName,
          to_uid: requestingFromId
          // TODO: Eventually we need to extract file extension from this or a similar parameter.
          // Currently we only handle videos uploaded as invite.mp4.
          // video_url: ctx.request.body.videoUrl
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };
      const newMember = {
        username,
        full_name: fullName,
        request_invite_from_member_id: requestingFromId,
        invite_confirmed: false,
        created_at: firestore.FieldValue.serverTimestamp(),
        request_invite_block_at: null,
        request_invite_block_seq: null,
        request_invite_op_seq: null
      };

      createCoconutVideoEncodingJob(
        config,
        storage,
        coconutApiKey,
        loggedInUid
      );

      const newOperationDoc = await operationsCollection.add(newOperation);
      await loggedInMemberRef.create(newMember);
      return {
        body: {
          ...(await newOperationDoc.get()).data(),
          id: newOperationDoc.id
        } as Operation,
        status: 201
      };
    }
  );

/**
 * Create a trust relationship to a target member from the logged in member
 */
export const trust = (
  db: Firestore,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
) =>
  createApiRoute<TrustMemberApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInUid = loggedInMemberToken.uid;
      const memberToTrustId = call.params.memberId;
      const memberToTrust = await transaction.get(
        membersCollection.doc(memberToTrustId)
      );

      if (!memberToTrust) {
        throw new NotFoundError(memberToTrustId);
      }
      if (
        !(await transaction.get(
          operationsCollection
            .where("creator_uid", "==", loggedInUid)
            .where("op_code", "==", OperationType.TRUST)
            .where("data.to_uid", "==", memberToTrustId)
        )).empty
      ) {
        throw new AlreadyTrustedError(memberToTrustId);
      }

      const newOperation: OperationToInsert = {
        creator_uid: loggedInUid,
        op_code: OperationType.TRUST,
        data: {
          to_uid: memberToTrustId
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };
      const newOperationRef = operationsCollection.doc();
      if (memberToTrust.get("request_invite_from_member_id") === loggedInUid) {
        transaction.update(memberToTrust.ref, {
          invite_confirmed: true
        });
      }
      transaction.set(newOperationRef, newOperation);

      return newOperationRef;
    });

    return {
      body: {
        ...(await newOperationReference.get()).data(),
        id: newOperationReference.id
      } as Operation,
      status: 201
    };
  });

/**
 * Give Raha to a target member from the logged in member.
 */
export const give = (
  db: Firestore,
  membersCollection: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<GiveApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInMemberId = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(
        membersCollection.doc(loggedInMemberId)
      );

      const memberToGiveToId = call.params.memberId;
      const memberToGiveTo = await getMemberById(
        membersCollection,
        memberToGiveToId
      );
      if (!memberToGiveTo) {
        throw new NotFoundError(memberToGiveToId);
      }

      const { amount, memo } = call.body;

      const donationRecipientId =
        memberToGiveTo.get("donation_to") || DEFAULT_DONATION_RECIPIENT_UID;
      const donationRecipient = await transaction.get(
        membersCollection.doc(donationRecipientId)
      );

      if (donationRecipient === undefined) {
        throw new NotFoundError(
          donationRecipientId,
          "Donation recipient not found."
        );
      }

      const fromBalance = new Big(loggedInMember.get("raha_balance") || 0);
      const toBalance = new Big(memberToGiveTo.get("raha_balance") || 0);
      const donationRecipientBalance = new Big(
        donationRecipient.get("raha_balance") || 0
      );

      const donationRate = new Big(
        memberToGiveTo.get("donation_rate") || DEFAULT_DONATION_RATE
      );
      const bigAmount = new Big(amount);
      // Round to 2 decimal places and using rounding mode 0 = round down.
      const donationAmount = bigAmount.times(donationRate).round(2, 0);
      const toAmount = bigAmount.minus(donationAmount);

      const newFromBalance = fromBalance.minus(bigAmount);
      if (newFromBalance.lt(0)) {
        throw new InsufficientBalanceError();
      }

      const transactionMemo: string = memo ? memo : "";

      const newOperation: OperationToInsert = {
        creator_uid: loggedInMemberId,
        op_code: OperationType.GIVE,
        data: {
          to_uid: memberToGiveToId,
          amount: toAmount.toString(),
          memo: transactionMemo,
          donation_to: donationRecipient.id,
          donation_amount: donationAmount.toString()
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };

      const newOperationRef = operations.doc();

      transaction
        .update(loggedInMember.ref, {
          raha_balance: newFromBalance.toString()
        })
        .update(memberToGiveTo.ref, {
          raha_balance: toBalance.plus(bigAmount).toString()
        })
        .update(donationRecipient.ref, {
          raha_balance: donationRecipientBalance.plus(donationAmount).toString()
        })
        .set(newOperationRef, newOperation);
      return newOperationRef;
    });

    return {
      body: {
        ...(await newOperationReference.get()).data(),
        id: newOperationReference.id
      } as Operation,
      status: 201
    };
  });

async function _createInvitedMember(
  config: Config,
  storage: BucketStorage,
  transaction: FirebaseFirestore.Transaction,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference,
  loggedInUid: string,
  fullName: string,
  emailAddress: string,
  username: string,
  videoToken: string,
  inviteToken: string
) {
  const inviteOperations = await operationsCollection
    .where("op_code", "==", OperationType.INVITE)
    .where("data.invite_token", "==", inviteToken)
    .get();
  if (inviteOperations.empty) {
    throw new InvalidInviteTokenError();
  }
  const inviteOperation = inviteOperations.docs[0];

  const requestInviteFromMemberId: MemberId = inviteOperation.get(
    "creator_uid"
  );
  const isJointVideo: boolean = inviteOperation.get("data.is_joint_video");
  const inviteVideoToken: string = inviteOperation.get("data.video_token");

  if (
    !requestInviteFromMemberId ||
    isJointVideo === undefined ||
    !inviteVideoToken
  ) {
    throw new InvalidInviteOperationError();
  }

  const requestingFromMember = await transaction.get(
    membersCollection.doc(requestInviteFromMemberId)
  );
  if (!requestingFromMember.exists) {
    throw new NotFoundError(requestInviteFromMemberId);
  }

  const newCreateMemberOperation: OperationToInsert = {
    creator_uid: loggedInUid,
    op_code: OperationType.CREATE_MEMBER,
    data: {
      username,
      full_name: fullName,
      request_invite_from_member_id: requestInviteFromMemberId,
      identity_video_url: getPublicInviteVideoUrlForMember(config, loggedInUid)
    },
    created_at: firestore.FieldValue.serverTimestamp()
  };

  const newRequestVerificationOperation: OperationToInsert = {
    creator_uid: loggedInUid,
    op_code: OperationType.REQUEST_VERIFICATION,
    data: {
      to_uid: requestInviteFromMemberId,
      invite_token: inviteToken
    },
    created_at: firestore.FieldValue.serverTimestamp()
  };
  const newMember = {
    username,
    full_name: fullName,
    // TODO Remove or-check once we're sure all clients have upgraded to request email on signup.
    // Updated client will have version number 0.0.6 for Android.
    email_address: emailAddress || "",
    email_address_is_verified: false,
    request_invite_from_member_id: requestInviteFromMemberId,
    invite_confirmed: false,
    identity_video_url: getPublicInviteVideoUrlForMember(config, loggedInUid),
    created_at: firestore.FieldValue.serverTimestamp()
  };

  const createMemberOperationRef = operationsCollection.doc();
  transaction.create(createMemberOperationRef, newCreateMemberOperation);
  const requestVerificationOperationRef = operationsCollection.doc();
  transaction.create(
    requestVerificationOperationRef,
    newRequestVerificationOperation
  );
  transaction.create(membersCollection.doc(loggedInUid), newMember);

  movePrivateVideoToPublicInviteVideo(
    config,
    storage,
    loggedInUid,
    videoToken,
    // If the videoToken == the videoToken of the identity video, then we want to leave
    // the private video in place so that the verifier can confirm it.
    videoToken !== inviteVideoToken
  );

  return [createMemberOperationRef, requestVerificationOperationRef];
}

async function _createUninvitedMember(
  config: Config,
  storage: BucketStorage,
  transaction: FirebaseFirestore.Transaction,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference,
  loggedInUid: string,
  fullName: string,
  emailAddress: string,
  username: string,
  videoToken: string
) {
  const newCreateMemberOperation: OperationToInsert = {
    creator_uid: loggedInUid,
    op_code: OperationType.CREATE_MEMBER,
    data: {
      username,
      full_name: fullName,
      identity_video_url: getPublicInviteVideoUrlForMember(config, loggedInUid)
    },
    created_at: firestore.FieldValue.serverTimestamp()
  };
  const newMember = {
    username,
    full_name: fullName,
    // TODO Remove or-check once we're sure all clients have upgraded to request email on signup.
    // Updated client will have version number 0.0.6 for Android.
    email_address: emailAddress || "",
    email_address_is_verified: false,
    invite_confirmed: false,
    identity_video_url: getPublicInviteVideoUrlForMember(config, loggedInUid),
    created_at: firestore.FieldValue.serverTimestamp()
  };

  const createMemberOperationRef = operationsCollection.doc();
  transaction.create(createMemberOperationRef, newCreateMemberOperation);
  const newMemberRef = membersCollection.doc(loggedInUid);
  transaction.create(newMemberRef, newMember);

  movePrivateVideoToPublicInviteVideo(
    config,
    storage,
    loggedInUid,
    videoToken,
    true
  );

  return [createMemberOperationRef];
}

/**
 * This endpoint begins the next version of how members will join Raha.
 *
 * For someone to become a full member of Raha, 2-3 operations must happen:
 *  1. CreateMember - This creates a Member account for the user and includes a
 *       video in which the user states their identity.
 *  2. (Optional) RequestVerification - This operation indicates that the new
 *       member would like to request identity verification from an existing member
 *       of Raha.
 *  3. Verify - This operation indicates that an existing verified member of Raha
 *       is verifying the new member's identity, and must include a video in which
 *       the existing member does so.
 *
 * If the member is joining via an async verification flow, the create and verify
 * member operations will have different videos. Otherwise, they can point to the
 * same video.
 *
 * Eventually, RequestInvite will be replaced by CreateMember and Verify operations.
 *
 * However, the Trust operation will continue to coexist with Verify. Trust does not
 * require a video, but is also not sufficient to verify a member's identity for
 * the UBI.
 */
export const createMember = (
  config: Config,
  db: Firestore,
  storage: BucketStorage,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
) =>
  createApiRoute<CreateMemberApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReferences = await db.runTransaction(
      async transaction => {
        const loggedInUid = loggedInMemberToken.uid;
        const loggedInMemberRef = membersCollection.doc(loggedInUid);

        if ((await transaction.get(loggedInMemberRef)).exists) {
          throw new AlreadyRequestedError();
        }

        const {
          username,
          fullName,
          emailAddress,
          videoToken,
          inviteToken
        } = call.body;

        if (!username) {
          throw new MissingParamsError(["username"]);
        }
        if (!fullName) {
          throw new MissingParamsError(["fullName"]);
        }
        // TODO Enable this check once we're sure all clients have upgraded to request email on signup.
        // Updated client will have version number 0.0.6 for Android.
        // if (!emailAddress) {
        //   throw new MissingParamsError(["emailAddress"]);
        // }
        if (!videoToken) {
          throw new MissingParamsError(["videoToken"]);
        }

        const opRefs = inviteToken
          ? _createInvitedMember(
              config,
              storage,
              transaction,
              membersCollection,
              operationsCollection,
              loggedInUid,
              fullName,
              emailAddress,
              username,
              videoToken,
              inviteToken
            )
          : _createUninvitedMember(
              config,
              storage,
              transaction,
              membersCollection,
              operationsCollection,
              loggedInUid,
              fullName,
              emailAddress,
              username,
              videoToken
            );

        return opRefs;
      }
    );

    return {
      body: await Promise.all(
        newOperationReferences.map(
          async opRef => (await opRef.get()).data() as Operation
        )
      ),
      status: 201
    };
  });

/**
 * Create a verify relationship to a target member from the logged in member
 *
 * As of 2018/08/31, the `video_token` field in the payload refers to a Google
 * Cloud bucket that contains two files: `video.mp4` and `thumbnail.jpg`. These
 * files are uploaded by the client directly via Firebase, not by any calls
 * to the API.
 */
export const verify = (
  config: Config,
  db: Firestore,
  storage: BucketStorage,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
) =>
  createApiRoute<VerifyMemberApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInUid = loggedInMemberToken.uid;
      const toVerifyMemberId = call.params.memberId;
      const memberToVerify = await transaction.get(
        membersCollection.doc(toVerifyMemberId)
      );

      if (!memberToVerify) {
        throw new NotFoundError(toVerifyMemberId);
      }

      const { videoToken } = call.body;

      if (!videoToken) {
        throw new MissingParamsError(["videoToken"]);
      }

      const existingVerifyOperations = await transaction.get(
        operationsCollection
          .where("creator_uid", "==", loggedInUid)
          .where("op_code", "==", OperationType.VERIFY)
          .where("data.to_uid", "==", toVerifyMemberId)
      );
      if (!existingVerifyOperations.empty) {
        // Note we do not throw an error here since we want to transition to an idempotent API.
        // TODO What should we do if there are multiple matching verify operations? That's a weird state to be in.
        // TODO What should we do with the video in this case?
        return existingVerifyOperations.docs[0].ref;
      }

      const videoUrl = getPublicUrlForMemberAndToken(
        config,
        loggedInUid,
        videoToken
      );

      const newOperation: OperationToInsert = {
        creator_uid: loggedInUid,
        op_code: OperationType.VERIFY,
        data: {
          to_uid: toVerifyMemberId,
          video_url: videoUrl
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };
      const newOperationRef = operationsCollection.doc();
      if (memberToVerify.get("request_invite_from_member_id") === loggedInUid) {
        transaction.update(memberToVerify.ref, {
          invite_confirmed: true
        });
      }
      transaction.set(newOperationRef, newOperation);

      await movePrivateVideoToPublicVideo(
        config,
        storage,
        loggedInUid,
        videoToken,
        true
      );

      return newOperationRef;
    });

    return {
      body: {
        ...(await newOperationReference.get()).data(),
        id: newOperationReference.id
      } as Operation,
      status: 201
    };
  });
