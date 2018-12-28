import Big from "big.js";
import { firestore } from "firebase-admin";
import { Firestore, CollectionReference } from "@google-cloud/firestore";

import {
  MintType,
  MintBasicIncomePayload,
  MintReferralBonusPayload,
  OperationType,
  MintInvitedBonusPayload
} from "@raha/api-shared/dist/models/Operation";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { AlreadyMintedInvitedBonus } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/AlreadyMintedInvitedBonus";
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
import { Config } from "@raha/api-shared/dist/helpers/Config";

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
  throwIfTooLarge(bigAmount, Config.REFERRAL_BONUS);

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

  // Verify that bonus for inviting this member hasn't been claimed by anyone.
  if (
    !(await transaction.get(
      operations
        .where("op_code", "==", OperationType.MINT)
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

async function _mintInvitedBonus(
  transaction: FirebaseFirestore.Transaction,
  operations: FirebaseFirestore.CollectionReference,
  loggedInMember: firestore.DocumentSnapshot,
  amount: Big
): Promise<MintInvitedBonusPayload> {
  if (!loggedInMember.get("invite_confirmed")) {
    throw new NotVerifiedError(loggedInMember.id);
  }
  const createdAt = loggedInMember.createTime;
  if (!createdAt) {
    // TODO create some type for generic unspecified error tht we do not expect client to interpret,
    // because we don't expect it to happen and want devs to be alerted if it does.
    throw Error("Logged in member create time did not exist, there is a bug.");
  }
  const allowedAmount = Config.getInvitedBonus(createdAt.toMillis());
  throwIfTooLarge(amount, allowedAmount);

  // Verify that bonus hasn't been claimed.
  if (
    !(await transaction.get(
      operations
        .where("op_code", "==", OperationType.MINT)
        .where("data.type", "==", MintType.INVITED_BONUS)
        .where("creator_uid", "==", loggedInMember.id)
    )).empty
  ) {
    throw new AlreadyMintedInvitedBonus();
  }

  return {
    type: MintType.INVITED_BONUS,
    amount: amount.toString()
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
      } else if (call.body.type === MintType.INVITED_BONUS) {
        mintData = await _mintInvitedBonus(
          transaction,
          operations,
          loggedInMember,
          bigAmount
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

function throwIfTooLarge(amount: Big, allowedAmount: Big) {
  if (amount.gt(allowedAmount)) {
    throw new MintAmountTooLargeError(amount, allowedAmount);
  }
}
