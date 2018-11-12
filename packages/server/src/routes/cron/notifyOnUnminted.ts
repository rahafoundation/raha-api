import { Firestore, CollectionReference } from "@google-cloud/firestore";
import { createApiRoute } from "..";
import { CronNotifyOnUnmintedApiEndpoint } from "@raha/api-shared/dist/routes/cron/definitions";
import { sendPushNotification } from "../../helpers/sendPushNotification";
import { messaging as adminMessaging } from "firebase-admin";

const RAHUL_TEST_MEMBER_UID = "CrwYE402nwYPzClqaQNcJxL4QDt1";

export const notifyOnUnminted = (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  fcmTokensCollection: CollectionReference,
  membersCollection: CollectionReference
) =>
  createApiRoute<CronNotifyOnUnmintedApiEndpoint>(
    async (call, loggedInMemberToken) => {
      sendPushNotification(
        messaging,
        fcmTokensCollection,
        RAHUL_TEST_MEMBER_UID,
        "This is a test.",
        "Fear not."
      );
      return {
        body: { message: "Test successful." },
        status: 200
      };
    }
  );
