import { CollectionReference } from "@google-cloud/firestore";

import {
  SetFcmTokenApiEndpoint,
  ClearFcmTokenApiEndpoint
} from "@raha/api-shared/dist/routes/me/definitions";
import { createApiRoute } from "..";
import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";

/**
 * Clear all references to a given FCM token. Called when a user logs out
 * so they don't keep receiving push notifications.
 */
export const clearFcmToken = (fcmTokens: CollectionReference) =>
  createApiRoute<ClearFcmTokenApiEndpoint>(async call => {
    const { fcmToken } = call.body;
    if (!fcmToken) {
      throw new MissingParamsError(["fcmToken"]);
    }

    // No need to wait for all the promises to return. Let them finish as they will.
    (await fcmTokens.where("fcm_token", "==", fcmToken).get()).forEach(
      async doc => {
        try {
          doc.ref.delete();
        } catch (exception) {
          // tslint:disable-next-line:no-console
          console.error(exception);
        }
      }
    );

    return {
      body: { message: "Removing all references to this FCM token." },
      status: 200
    };
  });

/**
 * Update the fcm token for a given member.
 */
export const setFcmToken = (
  members: CollectionReference,
  fcmTokens: CollectionReference
) =>
  createApiRoute<SetFcmTokenApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInUid = loggedInMemberToken.uid;
    const loggedInMember = await members.doc(loggedInUid).get();

    if (!loggedInMember) {
      throw new HttpApiError(
        403,
        "User must have an associated Raha Member.",
        {}
      );
    }

    const { fcmToken } = call.body;
    if (!fcmToken) {
      throw new MissingParamsError(["fcmToken"]);
    }

    const loggedInMemberId = loggedInMember.id;
    await fcmTokens.doc(loggedInMemberId).set({
      fcm_token: call.body.fcmToken
    });
    return { body: { message: "Updated member FCM token." }, status: 201 };
  });
