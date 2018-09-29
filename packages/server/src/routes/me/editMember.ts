import { CollectionReference, Firestore } from "@google-cloud/firestore";

import { EditMemberApiEndpoint } from "@raha/api-shared/dist/routes/me/definitions";
import { firestore } from "firebase-admin";
import { OperationType } from "@raha/api-shared/dist/models/Operation";
import { OperationApiResponseBody } from "@raha/api-shared/dist/routes/ApiEndpoint/ApiResponse";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";

import { createApiRoute } from "..";

export const editMember = (
  db: Firestore,
  members: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<EditMemberApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInUid = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(members.doc(loggedInUid));

      const { full_name, username } = call.body;

      if (!full_name && !username) {
        throw new MissingParamsError(["full_name", "username"]);
      }

      const updatedFields = {
        ...(full_name ? { full_name } : {}),
        ...(username ? { username } : {})
      };

      const newOperationRef = operations.doc();
      const newOperationData = {
        creator_uid: loggedInUid,
        op_code: OperationType.EDIT_MEMBER,
        data: updatedFields,
        created_at: firestore.FieldValue.serverTimestamp()
      };

      transaction
        .create(newOperationRef, newOperationData)
        .update(loggedInMember.ref, {
          last_updated_at: firestore.FieldValue.serverTimestamp(),
          updatedFields
        });

      return newOperationRef;
    });

    const createdOperationData = (await newOperationReference.get()).data();

    return {
      status: 201,
      body: {
        id: newOperationReference.id,
        ...createdOperationData
      } as OperationApiResponseBody
    };
  });
