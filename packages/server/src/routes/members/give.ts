import { CollectionReference, Firestore } from "@google-cloud/firestore";
import { firestore, messaging as adminMessaging, auth } from "firebase-admin";
import Big from "big.js";

import {
  GiveOperation,
  Operation,
  OperationType,
  GiveContent,
  GiveContentType
} from "@raha/api-shared/dist/models/Operation";
import { InsufficientBalanceError } from "@raha/api-shared/dist/errors/RahaApiError/members/give/InsufficientBalanceError";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";

import { createApiRoute, OperationToInsert } from "..";
import { getMemberById } from "../../collections/members";
import { sendPushNotification } from "../../helpers/sendPushNotification";
import {
  GiveApiEndpoint,
  GiveApiCall,
  GiveApiResponse
} from "@raha/api-shared/dist/routes/members/definitions";
import { GiveApiCall as LegacyGiveApiCall } from "raha-api-shared-0.1.13/dist/routes/members/definitions";
import {
  ApiEndpointName,
  ApiEndpointDefinition
} from "@raha/api-shared/dist/routes/ApiEndpoint";

const DEFAULT_DONATION_RECIPIENT_UID = "RAHA";
const DEFAULT_DONATION_RATE = 0.03;

function _notificationMessageForGive(
  senderName: string,
  amount: string,
  content?: GiveContent
) {
  const prefix = `${senderName} gave you ${amount} Raha`;
  if (!content) {
    return prefix;
  }

  switch (content.type) {
    case GiveContentType.TEXT:
      return `${prefix} for ${content.content}`;
    case GiveContentType.VIDEO:
      return `${prefix} with a video 📹`;
  }
}
/**
 * A function to notify the recipient of a Give operation.
 */
async function _notifyGiveRecipient(
  messaging: adminMessaging.Messaging,
  members: CollectionReference,
  fcmTokens: CollectionReference,
  giveOperation: GiveOperation
) {
  const { id, creator_uid, data } = giveOperation;
  const { to_uid, amount, content } = data;

  const fromMember = await members.doc(creator_uid).get();
  const toMember = await members.doc(to_uid).get();

  if (!fromMember.exists || !toMember.exists) {
    throw new Error(
      `Invalid give operation with ID ${id}. One or both members does not exist.`
    );
  }

  await sendPushNotification(
    messaging,
    fcmTokens,
    toMember.id,
    "You received Raha!",
    _notificationMessageForGive(fromMember.get("full_name"), amount, content)
  );
}

/**
 * DELETE once we no longer support sending give requests with `memo` field,
 * instead of with `content` field
 *
 * START legacy handling code
 */
export type LegacyGiveApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.GIVE,
  LegacyGiveApiCall,
  GiveApiResponse
>;
export const legacyGive = async (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operations: CollectionReference,
  fcmTokens: CollectionReference,
  request: LegacyGiveApiCall["request"],
  loggedInMemberToken: auth.DecodedIdToken
): Promise<GiveApiResponse> => {
  const newOperationReference = await db.runTransaction(async transaction => {
    const loggedInMemberId = loggedInMemberToken.uid;
    const loggedInMember = await transaction.get(
      membersCollection.doc(loggedInMemberId)
    );

    const memberToGiveToId = request.params.memberId;
    const memberToGiveTo = await getMemberById(
      membersCollection,
      memberToGiveToId
    );
    if (!memberToGiveTo) {
      throw new NotFoundError(memberToGiveToId);
    }

    const donationRecipientId =
      memberToGiveTo.get("donation_to") || DEFAULT_DONATION_RECIPIENT_UID;
    const donationRecipient = await transaction.get(
      membersCollection.doc(donationRecipientId)
    );

    if (donationRecipient === undefined) {
      throw new NotFoundError(
        donationRecipientId,
        "Donation recipient not found."
      );
    }

    const fromBalance = new Big(loggedInMember.get("raha_balance") || 0);
    const toBalance = new Big(memberToGiveTo.get("raha_balance") || 0);
    const donationRecipientBalance = new Big(
      donationRecipient.get("raha_balance") || 0
    );

    const donationRate = new Big(
      memberToGiveTo.get("donation_rate") || DEFAULT_DONATION_RATE
    );
    const bigAmount = new Big(request.body.amount);
    // Round to 2 decimal places and using rounding mode 0 = round down.
    const donationAmount = bigAmount.times(donationRate).round(2, 0);
    const toAmount = bigAmount.minus(donationAmount);

    const newFromBalance = fromBalance.minus(bigAmount);
    if (newFromBalance.lt(0)) {
      throw new InsufficientBalanceError();
    }

    const newOperation: OperationToInsert = {
      creator_uid: loggedInMemberId,
      op_code: OperationType.GIVE,
      data: {
        to_uid: memberToGiveToId,
        amount: toAmount.toString(),
        donation_to: donationRecipient.id,
        donation_amount: donationAmount.toString(),
        content: request.body.memo
          ? { type: GiveContentType.TEXT, content: request.body.memo }
          : undefined
      },
      created_at: firestore.FieldValue.serverTimestamp()
    };

    const newOperationRef = operations.doc();

    transaction
      .update(loggedInMember.ref, {
        raha_balance: newFromBalance.toString()
      })
      .update(memberToGiveTo.ref, {
        raha_balance: toBalance.plus(bigAmount).toString()
      })
      .update(donationRecipient.ref, {
        raha_balance: donationRecipientBalance.plus(donationAmount).toString()
      })
      .set(newOperationRef, newOperation);
    return newOperationRef;
  });

  const newOperationData = (await newOperationReference.get()).data();

  // Notify the recipient, but never let notification failure cause this API request to fail.
  _notifyGiveRecipient(
    messaging,
    membersCollection,
    fcmTokens,
    newOperationData as GiveOperation
  ).catch(exception => {
    // tslint:disable-next-line:no-console
    console.error(exception);
  });

  return {
    body: {
      ...newOperationData,
      id: newOperationReference.id
    } as Operation,
    status: 201
  };
};
// END legacy handling code. also delete switch below.

/**
 * Give Raha to a target member from the logged in member.
 */
export const give = (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operations: CollectionReference,
  fcmTokens: CollectionReference
) =>
  createApiRoute<LegacyGiveApiEndpoint | GiveApiEndpoint>(
    async (request, loggedInMemberToken) => {
      // DELETE once we no longer support sending give requests with `memo` field,
      // instead of with `content` field
      // START legacy handling code
      if (!("content" in request.body)) {
        return legacyGive(
          db,
          messaging,
          membersCollection,
          operations,
          fcmTokens,
          request,
          loggedInMemberToken
        );
      }
      // END legacy handling code

      const newOperationReference = await db.runTransaction(
        async transaction => {
          const loggedInMemberId = loggedInMemberToken.uid;
          const loggedInMember = await transaction.get(
            membersCollection.doc(loggedInMemberId)
          );

          const memberToGiveToId = request.params.memberId;
          const memberToGiveTo = await getMemberById(
            membersCollection,
            memberToGiveToId
          );
          if (!memberToGiveTo) {
            throw new NotFoundError(memberToGiveToId);
          }

          const donationRecipientId =
            memberToGiveTo.get("donation_to") || DEFAULT_DONATION_RECIPIENT_UID;
          const donationRecipient = await transaction.get(
            membersCollection.doc(donationRecipientId)
          );

          if (donationRecipient === undefined) {
            throw new NotFoundError(
              donationRecipientId,
              "Donation recipient not found."
            );
          }

          const fromBalance = new Big(loggedInMember.get("raha_balance") || 0);
          const toBalance = new Big(memberToGiveTo.get("raha_balance") || 0);
          const donationRecipientBalance = new Big(
            donationRecipient.get("raha_balance") || 0
          );

          const donationRate = new Big(
            memberToGiveTo.get("donation_rate") || DEFAULT_DONATION_RATE
          );

          const bigAmount = new Big(request.body.amount);
          // Round to 2 decimal places and using rounding mode 0 = round down.
          const donationAmount = bigAmount.times(donationRate).round(2, 0);
          const toAmount = bigAmount.minus(donationAmount);

          const newFromBalance = fromBalance.minus(bigAmount);
          if (newFromBalance.lt(0)) {
            throw new InsufficientBalanceError();
          }

          const newOperation: OperationToInsert = {
            creator_uid: loggedInMemberId,
            op_code: OperationType.GIVE,
            data: {
              to_uid: memberToGiveToId,
              amount: toAmount.toString(),
              donation_to: donationRecipient.id,
              donation_amount: donationAmount.toString(),
              content:
                "content" in request.body ? request.body.content : undefined
            },
            created_at: firestore.FieldValue.serverTimestamp()
          };

          const newOperationRef = operations.doc();

          transaction
            .update(loggedInMember.ref, {
              raha_balance: newFromBalance.toString()
            })
            .update(memberToGiveTo.ref, {
              raha_balance: toBalance.plus(bigAmount).toString()
            })
            .update(donationRecipient.ref, {
              raha_balance: donationRecipientBalance
                .plus(donationAmount)
                .toString()
            })
            .set(newOperationRef, newOperation);
          return newOperationRef;
        }
      );

      const newOperationData = (await newOperationReference.get()).data();

      // Notify the recipient, but never let notification failure cause this API request to fail.
      _notifyGiveRecipient(
        messaging,
        membersCollection,
        fcmTokens,
        newOperationData as GiveOperation
      ).catch(exception => {
        // tslint:disable-next-line:no-console
        console.error(exception);
      });

      return {
        body: {
          ...newOperationData,
          id: newOperationReference.id
        } as Operation,
        status: 201
      };
    }
  );
