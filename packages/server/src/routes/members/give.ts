import { CollectionReference, Firestore } from "@google-cloud/firestore";
import { firestore, messaging as adminMessaging, auth } from "firebase-admin";
import Big from "big.js";

import {
  GiveOperation,
  Operation,
  OperationType,
  GiveType,
  DirectGiveMetadata,
  TipMetadata,
  TipGiveOperation,
  DirectGiveOperation
} from "@raha/api-shared/dist/models/Operation";
import { InsufficientBalanceError } from "@raha/api-shared/dist/errors/RahaApiError/members/give/InsufficientBalanceError";
import {
  GiveApiEndpoint,
  TipApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";

import { createApiRoute, OperationToInsert, ApiHandler } from "..";
import { sendPushNotification } from "../../helpers/sendPushNotification";
import { validateAbilityToCreateOperation } from "../../helpers/abilities";
import {
  ApiEndpoint,
  ApiResponseDefinition
} from "@raha/api-shared/dist/routes/ApiEndpoint";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";

const DEFAULT_DONATION_RECIPIENT_UID = "RAHA";
const DEFAULT_DONATION_RATE = 0.03;

/**
 * A function to notify the recipient of a Give operation.
 */
async function _notifyGiveRecipient(
  messaging: adminMessaging.Messaging,
  members: CollectionReference,
  fcmTokens: CollectionReference,
  giveOperation: DirectGiveOperation
) {
  const { id, creator_uid, data } = giveOperation;
  const { to_uid, amount, donation_amount } = data;
  const memo = data.metadata.memo;

  const fromMember = await members.doc(creator_uid).get();
  const toMember = await members.doc(to_uid).get();

  if (!fromMember.exists || !toMember.exists) {
    throw new Error(
      `Invalid give operation with ID ${id}. One or both members does not exist.`
    );
  }
  const toMemberId = toMember.id;
  const displayAmount = new Big(amount).plus(donation_amount).toString();

  await sendPushNotification(
    messaging,
    fcmTokens,
    toMemberId,
    "You received Raha!",
    `${fromMember.get("full_name")} gave you ${displayAmount} Raha${
      memo ? ` for ${memo}` : ""
    }.`
  );
}

/**
 * A function to notify the recipient of a Tip operation.
 */
async function _notifyTipRecipient(
  messaging: adminMessaging.Messaging,
  members: CollectionReference,
  fcmTokens: CollectionReference,
  operations: CollectionReference,
  tipOperation: TipGiveOperation
) {
  const { id, creator_uid, data } = tipOperation;
  const { to_uid, amount, donation_amount } = data;

  const fromMember = await members.doc(creator_uid).get();
  const toMember = await members.doc(to_uid).get();
  const transaction = await operations
    .doc(data.metadata.targetOperationId)
    .get();

  if (!fromMember.exists || !toMember.exists) {
    throw new Error(
      `Invalid tip operation with ID ${id}. One or both members does not exist.`
    );
  }
  const toMemberId = toMember.id;
  const displayAmount = new Big(amount).plus(donation_amount).toString();

  await sendPushNotification(
    messaging,
    fcmTokens,
    toMemberId,
    "You received a tip!",
    `${fromMember.get("full_name")} tipped you ${displayAmount} Raha.`
  );
}

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
  createApiRoute<GiveApiEndpoint>(async (call, loggedInMemberToken) => {
    const transactionMemo: string = call.body.memo ? call.body.memo : "";
    const metadata: DirectGiveMetadata = {
      type: GiveType.DIRECT_GIVE,
      memo: transactionMemo
    };
    return _createGiveOperationAndNotify(
      db,
      messaging,
      membersCollection,
      operations,
      fcmTokens,
      loggedInMemberToken,
      call.params.memberId,
      call.body.amount,
      metadata,
      transactionMemo
    ).then((value: ApiResponseDefinition<201, Operation>) => {
      // Notify the recipient, but never let notification failure cause this API request to fail.
      _notifyGiveRecipient(
        messaging,
        membersCollection,
        fcmTokens,
        value.body as DirectGiveOperation
      ).catch(exception => {
        // tslint:disable-next-line:no-console
        console.error(exception);
      });
      return value;
    });
  });

/**
 * Tip Raha to a target member from the logged in member.
 */
export const tip = (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operations: CollectionReference,
  fcmTokens: CollectionReference
) =>
  createApiRoute<TipApiEndpoint>(async (call, loggedInMemberToken) => {
    const metadata: TipMetadata = {
      type: GiveType.TIP,
      targetOperationId: call.body.targetOperationId
    };
    return _createGiveOperationAndNotify(
      db,
      messaging,
      membersCollection,
      operations,
      fcmTokens,
      loggedInMemberToken,
      call.params.memberId,
      call.body.amount,
      metadata
    ).then((value: ApiResponseDefinition<201, Operation>) => {
      // Notify the recipient, but never let notification failure cause this API request to fail.
      _notifyTipRecipient(
        messaging,
        membersCollection,
        fcmTokens,
        operations,
        value.body as TipGiveOperation
      ).catch(exception => {
        // tslint:disable-next-line:no-console
        console.error(exception);
      });
      return value;
    });
  });

/**
 * Creates a GIVE Operation and notifies the recipient that the GIVE happened.
 */
const _createGiveOperationAndNotify = async (
  db: Firestore,
  messaging: adminMessaging.Messaging,
  membersCollection: CollectionReference,
  operations: CollectionReference,
  fcmTokens: CollectionReference,
  loggedInMemberToken: auth.DecodedIdToken,
  toMemberId: MemberId,
  amount: string,
  metadata: DirectGiveMetadata | TipMetadata,
  // Deprecated, but need to handle for older clients
  memo?: string
): Promise<ApiResponseDefinition<201, Operation>> => {
  const newOperationReference = await db.runTransaction(async transaction => {
    const loggedInMemberId = loggedInMemberToken.uid;
    const loggedInMember = await transaction.get(
      membersCollection.doc(loggedInMemberId)
    );

    await validateAbilityToCreateOperation(
      OperationType.GIVE,
      operations,
      transaction,
      loggedInMember
    );

    const memberToGiveToId = toMemberId;
    const memberToGiveTo = await transaction.get(
      membersCollection.doc(memberToGiveToId)
    );
    if (!memberToGiveTo.exists) {
      throw new NotFoundError(memberToGiveToId);
    }

    const donationRecipientId =
      memberToGiveTo.get("donation_to") || DEFAULT_DONATION_RECIPIENT_UID;
    const donationRecipient = await transaction.get(
      membersCollection.doc(donationRecipientId)
    );

    if (!donationRecipient.exists) {
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
    const bigAmount = new Big(amount);
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
        metadata,
        ...(memo && { memo })
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
  return {
    body: {
      ...newOperationData,
      id: newOperationReference.id
    } as Operation,
    status: 201
  };
};
