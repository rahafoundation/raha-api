import { CollectionReference, Firestore } from "@google-cloud/firestore";
import { firestore } from "firebase-admin";

import {
  OperationType,
  Operation
} from "@raha/api-shared/dist/models/Operation";
import { OperationId } from "@raha/api-shared/dist/models/identifiers";
import {
  FlagMemberApiEndpoint,
  ResolveFlagMemberApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";

import { OperationToInsert, createApiRoute } from "..";
import {
  canCreateOperation,
  validateAbilityToCreateOperation
} from "../../helpers/abilities";

/**
 * Flag the targeted member.
 */
export const flagMember = (
  db: Firestore,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
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

      if (!toFlagMember) {
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

    return {
      body: {
        ...(await newOperationReference.get()).data(),
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
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
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

          if (!flaggedMember) {
            throw new NotFoundError(flaggedMemberid);
          }

          if (!flagOperation) {
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

      return {
        body: {
          ...(await newOperationReference.get()).data(),
          id: newOperationReference.id
        } as Operation,
        status: 201
      };
    }
  );
