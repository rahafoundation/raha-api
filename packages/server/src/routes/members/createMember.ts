import { firestore, messaging as adminMessaging } from "firebase-admin";
import { OperationToInsert, createApiRoute } from "..";
import { CollectionReference, Firestore } from "@google-cloud/firestore";

import {
  OperationType,
  RequestVerificationOperation,
  Operation
} from "@raha/api-shared/dist/models/Operation";
import { InvalidInviteOperationError } from "@raha/api-shared/dist/errors/RahaApiError/members/createMember/InvalidInviteOperation";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import { InvalidInviteTokenError } from "@raha/api-shared/dist/errors/RahaApiError/members/createMember/InvalidInviteToken";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { MemberAlreadyExistsError } from "@raha/api-shared/dist/errors/RahaApiError/members/createMember/MemberAlreadyExists";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { CreateMemberApiEndpoint } from "@raha/api-shared/dist/routes/members/definitions";
import { VideoReference } from "@raha/api-shared/dist/models/MediaReference";

import { Config } from "../../config/config";
import { sendPushNotification } from "../../helpers/sendPushNotification";
import { validateAbilityToCreateOperation } from "../../helpers/abilities";

interface SgClient {
  request: (
    request: {
      method: string;
      url: string;
      body?: any;
    }
  ) => Promise<[any, { persisted_recipients: string[] }]>;
}

async function _notifyRequestVerificationRecipient(
  messaging: adminMessaging.Messaging,
  members: CollectionReference,
  fcmTokens: CollectionReference,
  requestVerificationOperation: RequestVerificationOperation
) {
  const { id, creator_uid, data } = requestVerificationOperation;

  const fromMember = await members.doc(creator_uid).get();
  const toMember = await members.doc(data.to_uid).get();

  if (!fromMember.exists || !toMember.exists) {
    throw new Error(
      `Invalid request verification operation with ID ${id}. One or both members does not exist.`
    );
  }
  const toMemberId = toMember.id;

  await sendPushNotification(
    messaging,
    fcmTokens,
    toMemberId,
    "New identity verification request!",
    // TODO: Actually make this notification link to the verify page and update message to that below
    // `Tap to verify ${fromMember.get("full_name")}'s account on Raha.`
    `${fromMember.get("full_name")} wants you to verify their identity on Raha!`
  );
}

async function _createInvitedMember({
  transaction,
  membersCollection,
  operationsCollection,
  loggedInUid,
  fullName,
  emailAddress,
  username,
  videoReference,
  inviteToken
}: {
  transaction: FirebaseFirestore.Transaction;
  membersCollection: CollectionReference;
  operationsCollection: CollectionReference;
  loggedInUid: string;
  fullName: string;
  emailAddress: string;
  username: string;
  videoReference: VideoReference;
  inviteToken: string;
}) {
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
      videoReference
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
    email_address: emailAddress || null,
    email_address_is_verified: false,
    request_invite_from_member_id: requestInviteFromMemberId,
    invite_confirmed: false,
    identityVideoReference: videoReference,
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

  return [createMemberOperationRef, requestVerificationOperationRef];
}

async function _createUninvitedMember(args: {
  transaction: FirebaseFirestore.Transaction;
  membersCollection: CollectionReference;
  operationsCollection: CollectionReference;
  loggedInUid: string;
  fullName: string;
  emailAddress: string;
  username: string;
  videoReference: VideoReference;
}) {
  const {
    transaction,
    membersCollection,
    operationsCollection,
    loggedInUid,
    fullName,
    emailAddress,
    username,
    videoReference
  } = args;

  const newCreateMemberOperation: OperationToInsert = {
    creator_uid: loggedInUid,
    op_code: OperationType.CREATE_MEMBER,
    data: {
      username,
      full_name: fullName,
      videoReference
    },
    created_at: firestore.FieldValue.serverTimestamp()
  };
  const newMember = {
    username,
    full_name: fullName,
    // TODO Remove or-check once we're sure all clients have upgraded to request email on signup.
    // Updated client will have version number 0.0.6 for Android.
    email_address: emailAddress || null,
    email_address_is_verified: false,
    invite_confirmed: false,
    identityVideoReference: videoReference,
    created_at: firestore.FieldValue.serverTimestamp()
  };

  const createMemberOperationRef = operationsCollection.doc();
  transaction.create(createMemberOperationRef, newCreateMemberOperation);
  const newMemberRef = membersCollection.doc(loggedInUid);
  transaction.create(newMemberRef, newMember);

  return [createMemberOperationRef];
}

/**
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
 * The Trust operation coexists with Verify. Trust does not
 * require a video, but is also not sufficient to verify a member's identity for
 * the UBI.
 */
export const createMember = (
  config: Config,
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference,
  fcmTokens: CollectionReference,
  sgClient: SgClient
) =>
  createApiRoute<CreateMemberApiEndpoint>(
    async (request, loggedInMemberToken) => {
      const newOperationReferences = await db.runTransaction(
        async transaction => {
          const loggedInUid = loggedInMemberToken.uid;
          const loggedInMemberRef = membersCollection.doc(loggedInUid);

          await validateAbilityToCreateOperation(
            OperationType.CREATE_MEMBER,
            operationsCollection,
            transaction
          );

          if ((await transaction.get(loggedInMemberRef)).exists) {
            throw new MemberAlreadyExistsError();
          }

          const {
            username,
            fullName,
            emailAddress,
            videoReference,
            inviteToken
          } = request.body;

          const requiredParams = {
            username,
            fullName,
            videoReference

            // TODO Enable this check once we're sure all clients have upgraded to request email on signup.
            // Updated client will have version number 0.0.6 for Android.
            // emailAddress
          };

          const missingParams = (Object.keys(requiredParams) as Array<
            keyof typeof requiredParams
          >).filter(key => requiredParams[key] === undefined);
          if (missingParams.length !== 0) {
            throw new MissingParamsError(missingParams);
          }

          const opRefs = inviteToken
            ? _createInvitedMember({
                transaction,
                membersCollection,
                operationsCollection,
                loggedInUid,
                fullName,
                emailAddress,
                username,
                videoReference,
                inviteToken
              })
            : _createUninvitedMember({
                transaction,
                membersCollection,
                operationsCollection,
                loggedInUid,
                fullName,
                emailAddress,
                username,
                videoReference
              });

          return opRefs;
        }
      );

      const newOpsData = await Promise.all(
        newOperationReferences.map(
          async opRef => (await opRef.get()).data() as Operation
        )
      );

      newOpsData.forEach(opData => {
        if (opData.op_code === OperationType.REQUEST_VERIFICATION) {
          // Notify the recipient, but never let notification failure cause this API request to fail.
          _notifyRequestVerificationRecipient(
            messaging,
            membersCollection,
            fcmTokens,
            opData
          ).catch(exception => {
            // tslint:disable-next-line:no-console
            console.error(exception);
          });
        }
      });

      _addEmailToMailingLists(
        config,
        sgClient,
        request.body.emailAddress,
        request.body.fullName,
        request.body.subscribeToNewsletter
      );

      return {
        body: newOpsData,
        status: 201
      };
    }
  );

async function _addEmailToMailingLists(
  config: Config,
  sgClient: SgClient,
  emailAddress: string,
  fullName: string,
  subscribeToNewsletter?: boolean
) {
  // Don't fail CREATE_MEMBER due to SendGrid API.
  try {
    const response = await sgClient.request({
      method: "POST",
      url: "/v3/contactdb/recipients",
      body: [{ email: emailAddress, full_name: fullName }]
    });

    const persisted_recipients = response[1].persisted_recipients;
    if (persisted_recipients.length === 0) {
      throw new Error(`SendGrid could not add recipient`);
    }
    const recipient_id = persisted_recipients[0];

    await sgClient.request({
      method: "POST",
      url: `/v3/contactdb/lists/${
        config.sendGrid.appRegistrationListId
      }/recipients/${recipient_id}`
    });

    if (subscribeToNewsletter) {
      await sgClient.request({
        method: "POST",
        url: `/v3/contactdb/lists/${
          config.sendGrid.updateNewsletterListId
        }/recipients/${recipient_id}`
      });
    }
  } catch (exception) {
    // tslint:disable-next-line:no-console
    console.error(
      "Failed adding ",
      emailAddress,
      " ( newsletter:",
      !!subscribeToNewsletter,
      "): ",
      exception
    );
  }
}
