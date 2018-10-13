import {
  firestore,
  storage as adminStorage,
  messaging as adminMessaging
} from "firebase-admin";
import * as Storage from "@google-cloud/storage";
import * as httpStatus from "http-status";
import { CollectionReference, Firestore } from "@google-cloud/firestore";

import {
  VerifyOperation,
  Operation,
  OperationType
} from "@raha/api-shared/dist/models/Operation";
import { VerifyMemberApiEndpoint } from "@raha/api-shared/dist/routes/members/definitions";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";

import { sendPushNotification } from "../../helpers/sendPushNotification";
import { Config } from "../../config/config";
import { createApiRoute, OperationToInsert } from "..";

type BucketStorage = adminStorage.Storage | Storage.Storage;

// function getPublicUrlForMemberAndToken(
//   config: Config,
//   memberUid: string,
//   videoToken: string
// ) {
//   return `https://storage.googleapis.com/${
//     config.publicVideoBucket
//   }/${memberUid}/${videoToken}/video.mp4`;
// }

/**
 * Expects the video to be at /private-video/<videoToken>/video.mp4.
 * Video is moved to /<publicBucket>/<memberUid>/<videoToken>/video.mp4.
 * TODO: Remove all other video handling functions. This should be all that we need.
 */
// async function movePrivateVideoToPublicVideo(
//   config: Config,
//   storage: BucketStorage,
//   memberUid: string,
//   videoToken: string,
//   removeOriginal: boolean
// ) {
//   const newVideoPath = `${memberUid}/${videoToken}/video.mp4`;
//   const publicVideoBucket = (storage as Storage.Storage).bucket(
//     config.publicVideoBucket
//   );
//   const publicVideoRef = publicVideoBucket.file(newVideoPath);
//   const publicThumbnailRef = publicVideoBucket.file(
//     `${newVideoPath}.thumb.jpg`
//   );

//   if ((await publicVideoRef.exists())[0]) {
//     throw new HttpApiError(
//       httpStatus.BAD_REQUEST,
//       "Video already exists at intended storage destination. Cannot overwrite.",
//       {}
//     );
//   }

//   const privateVideoPath = `private-video/${videoToken}`;
//   const privateVideoBucket = (storage as Storage.Storage).bucket(
//     config.privateVideoBucket
//   );
//   const privateVideoRef = privateVideoBucket.file(
//     `${privateVideoPath}/video.mp4`
//   );
//   const privateVideoThumbnailRef = (storage as Storage.Storage)
//     .bucket(config.privateVideoBucket)
//     .file(`${privateVideoPath}/thumbnail.jpg`);

//   if (!(await privateVideoRef.exists())[0]) {
//     throw new HttpApiError(
//       httpStatus.BAD_REQUEST,
//       "Private video does not exist at expected location. Cannot move.",
//       {}
//     );
//   }

//   await (removeOriginal
//     ? privateVideoRef.move(publicVideoRef)
//     : privateVideoRef.copy(publicVideoRef));

//   // Until the iOS app gets updated and starts generating thumbnails, we
//   // cannot throw an error on the thumbnail not existing.
//   // TODO: Throw an error on non-existent thumbnail once the iOS app gets updated.
//   if ((await privateVideoThumbnailRef.exists())[0]) {
//     await (removeOriginal
//       ? privateVideoThumbnailRef.move(publicThumbnailRef)
//       : privateVideoThumbnailRef.copy(publicThumbnailRef));
//   }

//   return publicVideoRef;
// }

async function _notifyVerifyRecipient(
  messaging: adminMessaging.Messaging,
  members: CollectionReference,
  fcmTokens: CollectionReference,
  verifyOperation: VerifyOperation
) {
  const { id, creator_uid, data } = verifyOperation;

  const fromMember = await members.doc(creator_uid).get();
  const toMember = await members.doc(data.to_uid).get();

  if (!fromMember.exists || !toMember.exists) {
    throw new Error(
      `Invalid verify operation with ID ${id}. One or both members does not exist.`
    );
  }
  const toMemberId = toMember.id;

  await sendPushNotification(
    messaging,
    fcmTokens,
    toMemberId,
    "Your account has been verified!",
    `${fromMember.get("full_name")} verified your identity on Raha!`
  );
}

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
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference,
  fcmTokensCollection: CollectionReference
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

      const { videoUrl } = call.body;

      if (!videoUrl) {
        throw new MissingParamsError(["videoUrl"]);
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

      // await movePrivateVideoToPublicVideo(
      //   config,
      //   storage,
      //   loggedInUid,
      //   videoToken,
      //   true
      // );

      return newOperationRef;
    });

    const newOperationData = (await newOperationReference.get()).data();

    // Notify the recipient, but never let notification failure cause this API request to fail.
    _notifyVerifyRecipient(
      messaging,
      membersCollection,
      fcmTokensCollection,
      newOperationData as VerifyOperation
    ).catch(exception => {
      // tslint:disable-next-line:no-console
      console.error(exception);
    });

    return {
      body: {
        ...newOperationData,
        id: newOperationReference.id
      } as Operation,
      status: 201
    };
  });
