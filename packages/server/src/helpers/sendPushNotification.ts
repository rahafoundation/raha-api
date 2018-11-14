import { messaging as adminMessaging } from "firebase-admin";
import { CollectionReference } from "@google-cloud/firestore";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";

// This is copied from raha-mobile//deeplinking.ts.
export enum DEEPLINK_ROUTES {
  profileTab = "profileTab",
  walletTab = "walletTab"
}

/**
 * Send a push notification. Uses Firebase Cloud Messaging. Returns true if message sent and false otherwise.
 */
export async function sendPushNotification(
  messaging: adminMessaging.Messaging,
  fcmTokens: CollectionReference,
  toMemberId: MemberId,
  title: string,
  body: string,
  data?: {
    deeplinkUrl: DEEPLINK_ROUTES;
  }
) {
  const fcmTokenData = await fcmTokens.doc(toMemberId).get();
  const fcmToken = fcmTokenData.exists
    ? fcmTokenData.get("fcm_token")
    : undefined;

  if (fcmToken) {
    await messaging.send({
      notification: {
        title,
        body
      },
      data,
      token: fcmToken
    });
    return true;
  }
  return false;
}
