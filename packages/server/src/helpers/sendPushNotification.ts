import { messaging as adminMessaging } from "firebase-admin";
import { CollectionReference } from "@google-cloud/firestore";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";

/**
 * Send a push notification. Uses Firebase Cloud Messaging. Returns true if message sent and false otherwise.
 */
export async function sendPushNotification(
  messaging: adminMessaging.Messaging,
  fcmTokens: CollectionReference,
  toMemberId: MemberId,
  title: string,
  body: string
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
      token: fcmToken
    });
    return true;
  }
  return false;
}
