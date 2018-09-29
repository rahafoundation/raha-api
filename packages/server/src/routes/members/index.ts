import { CollectionReference, Firestore } from "@google-cloud/firestore";
import { firestore } from "firebase-admin";

import {
  Operation,
  OperationType
} from "@raha/api-shared/dist/models/Operation";
import { TrustMemberApiEndpoint } from "@raha/api-shared/dist/routes/members/definitions";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { AlreadyTrustedError } from "@raha/api-shared/dist/errors/RahaApiError/members/trust/AlreadyTrustedError";

import { createApiRoute, OperationToInsert } from "..";

/**
 * Re-export methods.
 */
export { give } from "./give";
export { createMember } from "./createMember";
export { verify } from "./verify";

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
