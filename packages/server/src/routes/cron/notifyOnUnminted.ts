import {
  Firestore,
  CollectionReference,
  DocumentSnapshot
} from "@google-cloud/firestore";
import { auth as adminAuth, messaging as adminMessaging } from "firebase-admin";
import { PhoneNumberUtil } from "google-libphonenumber";
import * as moment from "moment";

import { CronNotifyOnUnmintedApiEndpoint } from "@raha/api-shared/dist/routes/cron/definitions";

import { createApiRoute } from "..";
import { sendPushNotification } from "../../helpers/sendPushNotification";
import {
  calculateMaxMintableForMember,
  MINT_CAP
} from "../../helpers/calculateMaxMintableForMember";

// Notify people if it is 12 o'clock in their local time.
const HOUR_TO_NOTIFY = 12;

/**
 * Note on region codes: Google-libphonenumber says they use CIDR region codes.
 * defaultTimezoneByCountryCode uses ISO-3166-2 region codes. I did a set
 * intersection on the region codes supported by my default-timezones lib
 * versus libphonenumber, and the only differences are AC (Ascension Island),
 * EH (Western Sahara), and TA (Tristan da Cunha). Good enough IMO.
 */
function getDefaultOffsetForPhoneNumber(
  phoneNumber: string
): string | undefined {
  const phoneNumberUtil = PhoneNumberUtil.getInstance();
  const countryCode = phoneNumberUtil.parse(phoneNumber).getCountryCode();
  if (countryCode) {
    const regionCode = phoneNumberUtil.getRegionCodeForCountryCode(countryCode);
    const defaultTimezoneByCountryCode = require("default-timezone-for-country/data/default_timezone_by_country_code.json");
    const timezone = defaultTimezoneByCountryCode[regionCode];
    if (timezone) {
      return timezone.utc_offset;
    }
  }
  return undefined;
}

/**
 * Return that we should notify the user if all the above is true:
 * * their max-mintable is >= the mint cap.
 * * they have an associated phone number (otherwise we can't notify them)
 * * their inferred local time is within the noon hour
 * * we haven't already notified them about their mintable amount
 */
async function shouldNotify(
  auth: adminAuth.Auth,
  member: DocumentSnapshot,
  memberNotificationHistory: DocumentSnapshot
) {
  const maxMintable = calculateMaxMintableForMember(member);
  if (maxMintable.gte(MINT_CAP)) {
    const userRecord = await auth.getUser(member.id);
    const phoneNumber = userRecord.phoneNumber;
    if (phoneNumber) {
      const offset = getDefaultOffsetForPhoneNumber(phoneNumber);
      const localTime = moment().utcOffset(offset || 0);
      if (localTime.hour() === HOUR_TO_NOTIFY) {
        if (memberNotificationHistory.exists) {
          return !memberNotificationHistory.get("notifiedOnUnmintedOverCap");
        }
        return true;
      }
    }
  }
  return false;
}

export const notifyOnUnminted = (
  auth: adminAuth.Auth,
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  fcmTokensCollection: CollectionReference,
  notificationHistoryCollection: CollectionReference
) =>
  createApiRoute<CronNotifyOnUnmintedApiEndpoint>(async call => {
    (await membersCollection.get()).forEach(async m => {
      db.runTransaction(async transaction => {
        try {
          const member = await transaction.get(membersCollection.doc(m.id));
          const memberNotificationHistory = await transaction.get(
            notificationHistoryCollection.doc(member.id)
          );
          if (await shouldNotify(auth, member, memberNotificationHistory)) {
            const title = `Mint ${calculateMaxMintableForMember(member)
              .round(2, 0)
              .toString()} Raha before it's too late!`;
            const body =
              "Your mintable amount will be capped at 40 Raha on Nov 15th. Tap this notification to mint now and avoid losing Raha!";
            try {
              if (
                await sendPushNotification(
                  messaging,
                  fcmTokensCollection,
                  member.id,
                  title,
                  body
                )
              ) {
                await transaction.set(memberNotificationHistory.ref, {
                  ...memberNotificationHistory.data,
                  notifiedOnUnmintedOverCap: true
                });
              }
            } catch (e) {
              console.error(
                `An error occurred notifying member with id ${
                  member.id
                } about unminted Raha.`,
                e
              );
            }
          }
        } catch (e) {
          console.error(
            "An error occurred notifying members about unminted Raha.",
            e
          );
        }
      });
    });

    return {
      body: { message: "Successfully notified members." },
      status: 200
    };
  });
