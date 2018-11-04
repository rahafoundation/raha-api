import { CollectionReference, Firestore } from "@google-cloud/firestore";
import { firestore, messaging as adminMessaging } from "firebase-admin";

import {
  OperationType,
  Operation,
  FlagMemberOperation,
  ResolveFlagMemberOperation
} from "@raha/api-shared/dist/models/Operation";
import { OperationId } from "@raha/api-shared/dist/models/identifiers";
import {
  FlagMemberApiEndpoint,
  ResolveFlagMemberApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";

import { OperationToInsert, createApiRoute } from "..";
import { validateAbilityToCreateOperation } from "../../helpers/abilities";
import { sendPushNotification } from "../../helpers/sendPushNotification";

function _flagOperationIsFlagMemberOperation(
  flagOperation: FlagMemberOperation | ResolveFlagMemberOperation
): flagOperation is FlagMemberOperation {
  return (
    (flagOperation as ResolveFlagMemberOperation).data.flag_operation_id ===
    undefined
  );
}

async function _notifyFlagRecipient(
  messaging: adminMessaging.Messaging,
  members: CollectionReference,
  fcmTokens: CollectionReference,
  flagOperation: FlagMemberOperation | ResolveFlagMemberOperation
) {
  const { id, creator_uid, data } = flagOperation;

  const fromMember = await members.doc(creator_uid).get();
  const toMember = await members.doc(data.to_uid).get();

  if (!fromMember.exists || !toMember.exists) {
    throw new Error(
      `Invalid flagMember operation with ID ${id}. One or both members does not exist.`
    );
  }
  const toMemberId = toMember.id;

  const isFlagMemberOperation = _flagOperationIsFlagMemberOperation(
    flagOperation
  );
  const notificationTitle = isFlagMemberOperation
    ? "Your account has been flagged."
    : "A flag on your account has been resolved!";
  const notificationBody = isFlagMemberOperation
    ? `${fromMember.get(
        "full_name"
      )} raised an issue with your account. See your profile to learn more.`
    : `Congratulations! ${fromMember.get(
        "full_name"
      )} resolved a flag on your account.`;

  await sendPushNotification(
    messaging,
    fcmTokens,
    toMemberId,
    notificationTitle,
    notificationBody
  );
}

/**
 * Flag the targeted member.
 */
export const flagMember = (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference,
  fcmTokensCollection: CollectionReference
) =>
  createApiRoute<FlagMemberApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInMemberId = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(
        membersCollection.doc(loggedInMemberId)
      );
      const toFlagMemberid = call.params.memberId;
      const toFlagMember = await transaction.get(
        membersCollection.doc(toFlagMemberid)
      );

      await validateAbilityToCreateOperation(
        OperationType.FLAG_MEMBER,
        operationsCollection,
        transaction,
        loggedInMember
      );

      if (!toFlagMember.exists) {
        throw new NotFoundError(toFlagMemberid);
      }

      const { reason } = call.body;

      const newOperation: OperationToInsert = {
        creator_uid: loggedInMemberId,
        op_code: OperationType.FLAG_MEMBER,
        data: {
          to_uid: toFlagMemberid,
          reason
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };

      const newOperationRef = operationsCollection.doc();
      transaction.set(newOperationRef, newOperation);

      const existingFlags: OperationId[] =
        toFlagMember.get("operationsFlaggingThisMember") || [];
      const newFlags = existingFlags.concat([newOperationRef.id]);
      transaction.update(toFlagMember.ref, {
        operationsFlaggingThisMember: newFlags
      });

      return newOperationRef;
    });

    const newOperationData = (await newOperationReference.get()).data();

    // Notify the recipient, but never let notification failure cause this API request to fail.
    _notifyFlagRecipient(
      messaging,
      membersCollection,
      fcmTokensCollection,
      newOperationData as FlagMemberOperation
    );

    return {
      body: {
        ...newOperationData,
        id: newOperationReference.id
      } as Operation,
      status: 201
    };
  });

/**
 * Resolve a flag on the targeted member.
 */
export const resolveFlagMember = (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference,
  fcmTokensCollection: CollectionReference
) =>
  createApiRoute<ResolveFlagMemberApiEndpoint>(
    async (call, loggedInMemberToken) => {
      const newOperationReference = await db.runTransaction(
        async transaction => {
          const loggedInMemberId = loggedInMemberToken.uid;
          const loggedInMember = await transaction.get(
            membersCollection.doc(loggedInMemberId)
          );
          const flaggedMemberid = call.params.memberId;
          const flaggedMember = await transaction.get(
            membersCollection.doc(flaggedMemberid)
          );

          const { reason, flag_operation_id } = call.body;

          const flagOperation = await transaction.get(
            operationsCollection.doc(flag_operation_id)
          );

          await validateAbilityToCreateOperation(
            OperationType.RESOLVE_FLAG_MEMBER,
            operationsCollection,
            transaction,
            loggedInMember
          );

          if (!flaggedMember.exists) {
            throw new NotFoundError(flaggedMemberid);
          }

          if (!flagOperation.exists) {
            throw new NotFoundError(flag_operation_id);
          }

          const newOperation: OperationToInsert = {
            creator_uid: loggedInMemberId,
            op_code: OperationType.RESOLVE_FLAG_MEMBER,
            data: {
              to_uid: flaggedMemberid,
              reason,
              flag_operation_id
            },
            created_at: firestore.FieldValue.serverTimestamp()
          };

          const newOperationRef = operationsCollection.doc();
          transaction.set(newOperationRef, newOperation);

          const memberFlags: OperationId[] =
            flaggedMember.get("operationsFlaggingThisMember") || [];
          const indexOfFlag = memberFlags.indexOf(flag_operation_id);
          if (indexOfFlag < 0) {
            // tslint:disable-next-line:no-console
            console.warn(
              `Member ${
                flaggedMember.id
              } operationsFlaggingThisMember array did not contain expected flag ${flag_operation_id} resolved by operation ${
                newOperationRef.id
              }.`
            );
          } else {
            memberFlags.splice(indexOfFlag, 1);
            transaction.update(flaggedMember.ref, {
              operationsFlaggingThisMember: memberFlags
            });
          }

          return newOperationRef;
        }
      );

      const newOperationData = (await newOperationReference.get()).data();

      // Notify the recipient, but never let notification failure cause this API request to fail.
      _notifyFlagRecipient(
        messaging,
        membersCollection,
        fcmTokensCollection,
        newOperationData as ResolveFlagMemberOperation
      );

      return {
        body: {
          ...newOperationData,
          id: newOperationReference.id
        } as Operation,
        status: 201
      };
    }
  );
