import Big from "big.js";
import { firestore } from "firebase-admin";
import { Firestore, CollectionReference } from "@google-cloud/firestore";

import {
  MintType,
  MintBasicIncomePayload,
  MintReferralBonusPayload,
  OperationType
} from "@raha/api-shared/dist/models/Operation";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { MintAmountTooLargeError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/MintAmountTooLargeError";
import { NotVerifiedError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/referral/NotVerifiedError";
import { NotInvitedError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/referral/NotInvitedError";
import { AlreadyMintedError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/referral/AlreadyMintedError";
import { MintApiEndpoint } from "@raha/api-shared/dist/routes/me/definitions";
import { MintInvalidTypeError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/MintInvalidTypeError";
import { OperationApiResponseBody } from "@raha/api-shared/dist/routes/ApiEndpoint/ApiResponse";

import { createApiRoute } from "..";
import { validateAbilityToCreateOperation } from "../../helpers/abilities";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { calculateMaxMintableForMember } from "../../helpers/calculateMaxMintableForMember";

const RAHA_REFERRAL_BONUS = 60;

function _mintBasicIncome(
  loggedInMember: firestore.DocumentSnapshot,
  bigAmount: Big
): MintBasicIncomePayload {
  const maxMintable = calculateMaxMintableForMember(loggedInMember);
  if (bigAmount.gt(maxMintable)) {
    throw new MintAmountTooLargeError(bigAmount, maxMintable);
  }

  return {
    type: MintType.BASIC_INCOME,
    amount: bigAmount.toString()
  };
}

async function _mintReferralBonus(
  transaction: FirebaseFirestore.Transaction,
  operations: FirebaseFirestore.CollectionReference,
  members: FirebaseFirestore.CollectionReference,
  loggedInMember: firestore.DocumentSnapshot,
  bigAmount: Big,
  invitedMemberId: MemberId
): Promise<MintReferralBonusPayload> {
  const invitedMember = await transaction.get(members.doc(invitedMemberId));

  if (!invitedMember.exists) {
    throw new NotFoundError(invitedMemberId);
  }

  if (
    !(invitedMember.get("request_invite_from_member_id") === loggedInMember.id)
  ) {
    throw new NotInvitedError(invitedMemberId);
  }

  if (!invitedMember.get("invite_confirmed")) {
    throw new NotVerifiedError(invitedMemberId);
  }

  if (bigAmount.gt(RAHA_REFERRAL_BONUS)) {
    throw new MintAmountTooLargeError(bigAmount, new Big(RAHA_REFERRAL_BONUS));
  }

  // Verify that bonus hasn't already been claimed.
  if (
    !(await transaction.get(
      operations
        .where("op_code", "==", OperationType.MINT)
        .where("creator_uid", "==", loggedInMember.id)
        .where("data.type", "==", MintType.REFERRAL_BONUS)
        .where("data.invited_member_id", "==", invitedMemberId)
    )).empty
  ) {
    throw new AlreadyMintedError(invitedMemberId);
  }

  return {
    type: MintType.REFERRAL_BONUS,
    amount: bigAmount.toString(),
    invited_member_id: invitedMember.id
  };
}

export const mint = (
  db: Firestore,
  members: CollectionReference,
  notificationHistory: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<MintApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInUid = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(members.doc(loggedInUid));
      const loggedInMemberNotificationHistory = await transaction.get(
        notificationHistory.doc(loggedInUid)
      );

      await validateAbilityToCreateOperation(
        OperationType.MINT,
        operations,
        transaction,
        loggedInMember
      );

      const { type, amount } = call.body;

      if (!type) {
        throw new MissingParamsError(["type"]);
      }
      if (!amount) {
        throw new MissingParamsError(["amount"]);
      }

      // Round to 2 decimal places and using rounding mode 0 = round down.
      const bigAmount = new Big(amount).round(2, 0);

      let mintData;
      if (call.body.type === MintType.BASIC_INCOME) {
        mintData = _mintBasicIncome(loggedInMember, bigAmount);
      } else if (call.body.type === MintType.REFERRAL_BONUS) {
        const { invited_member_id } = call.body;
        mintData = await _mintReferralBonus(
          transaction,
          operations,
          members,
          loggedInMember,
          bigAmount,
          invited_member_id
        );
      } else {
        throw new MintInvalidTypeError(type);
      }

      const creatorBalance = new Big(loggedInMember.get("raha_balance") || 0);

      const newCreatorBalance = creatorBalance.plus(bigAmount);
      const newOperation = {
        creator_uid: loggedInUid,
        op_code: "MINT",
        data: mintData,
        created_at: firestore.FieldValue.serverTimestamp()
      };
      const newOperationRef = operations.doc();
      const memberUpdate =
        type === MintType.BASIC_INCOME
          ? {
              raha_balance: newCreatorBalance.toString(),
              last_minted: firestore.FieldValue.serverTimestamp() // TODO Rename this field to "basic_income_last_minted"
            }
          : {
              raha_balance: newCreatorBalance.toString()
            };
      // clear notification history for unminted basic income if minting basic income
      const memberNotificationHistoryUpdate = {
        ...loggedInMemberNotificationHistory.data(),
        ...(type === MintType.BASIC_INCOME
          ? { notifiedOnUnmintedOverCap: false }
          : {})
      };
      transaction
        .update(loggedInMember.ref, {
          last_updated_at: firestore.FieldValue.serverTimestamp(),
          ...memberUpdate
        })
        .set(newOperationRef, newOperation)
        .set(
          loggedInMemberNotificationHistory.ref,
          memberNotificationHistoryUpdate
        );

      return newOperationRef;
    });

    return {
      body: {
        ...(await newOperationReference.get()).data(),
        id: newOperationReference.id
      } as OperationApiResponseBody,
      status: 201
    };
  });
