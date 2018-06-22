import { URL } from "url";
import Big from "big.js";
import { firestore } from "firebase-admin";
import { CollectionReference, Firestore } from "@google-cloud/firestore";
import * as httpStatus from "http-status";

import { Config } from "../../config/prod.config";
import { ApiError } from "../../errors/ApiError";
import { HttpVerb } from "../../helpers/http";
import { OperationId, MemberId } from "../../models/identifiers";
import {
  MintBasicIncomePayload,
  MintType,
  MintReferralBonusPayload,
  OperationType
} from "../../models/Operation";
import {
  ApiEndpointDefinition,
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointUri
} from "../ApiEndpoint";
import { createApiRoute } from "../";
import {
  OperationApiResponseBody,
  MessageApiResponseBody
} from "../ApiEndpoint/ApiResponse";
import { ApiLocationDefinition } from "../ApiEndpoint/ApiCall";
import { SendInviteApiEndpoint, MintApiEndpoint } from "./definitions";

const RAHA_UBI_WEEKLY_RATE = 10;
const RAHA_REFERRAL_BONUS = 60;
const MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}
export const sendInvite = (
  config: Config,
  sgMail: { send: (message: EmailMessage) => void },
  members: CollectionReference
) =>
  createApiRoute<SendInviteApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInMemberId = loggedInMemberToken.uid;
    const loggedInMember = await members.doc(loggedInMemberId).get();

    const { inviteEmail } = call.body;

    if (!loggedInMember.exists) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "You must yourself have been invited to Raha to send invites."
      );
    }

    if (!inviteEmail) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "No invite email included in request."
      );
    }

    const loggedInFullName = loggedInMember.get("full_name");
    const loggedInUsername = loggedInMember.get("username");
    const inviteLink = new URL(
      `/m/${loggedInUsername}/invite`,
      config.appBase
    ).toString();

    const msg = {
      to: inviteEmail,
      from: "invites@raha.io",
      subject: `${loggedInFullName} invited you to join Raha!`,
      text:
        "Raha is the foundation for a global universal basic income. " +
        "To ensure that only real humans can join, people must be invited " +
        `by an existing member of the Raha network. ${loggedInFullName} ` +
        "has invited you to join!\n\n" +
        `Visit ${inviteLink} to join Raha!`,
      html:
        "<span><strong>Raha is the foundation for a global universal basic income.</strong><br /><br />" +
        "To ensure that only real humans can join, people must be invited " +
        `by an existing member of the Raha network. ${loggedInFullName} ` +
        "has invited you to join!</span><br /><br />" +
        `<span><strong>Visit <a href="${inviteLink}">${inviteLink}</a> to join Raha!</strong></span>`
    };
    sgMail.send(msg);

    return {
      status: 201,
      body: {
        message: "Invite succesfully sent!"
      }
    };
  });

function mintBasicIncome(
  loggedInMember: firestore.DocumentSnapshot,
  bigAmount: Big
): MintBasicIncomePayload {
  const lastMinted: number =
    loggedInMember.get("last_minted") ||
    loggedInMember.get("created_at") ||
    Date.now();
  const now = Date.now();
  const sinceLastMinted = now - lastMinted;
  const maxMintable =
    (RAHA_UBI_WEEKLY_RATE * sinceLastMinted) / MILLISECONDS_PER_WEEK;
  if (bigAmount.gt(maxMintable)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Mint amount exceeds the allowed amount."
    );
  }
  return {
    type: MintType.BASIC_INCOME,
    amount: bigAmount.toString()
  };
}

async function mintReferralBonus(
  transaction: FirebaseFirestore.Transaction,
  operations: FirebaseFirestore.CollectionReference,
  members: FirebaseFirestore.CollectionReference,
  loggedInMember: firestore.DocumentSnapshot,
  bigAmount: Big,
  inviteOperationId: OperationId,
  trustOperationId: OperationId,
  invitedMemberId: MemberId
): Promise<MintReferralBonusPayload> {
  const inviteOperation = await transaction.get(
    operations.doc(inviteOperationId)
  );
  const trustOperation = await transaction.get(
    operations.doc(trustOperationId)
  );
  const invitedMember = await transaction.get(members.doc(invitedMemberId));

  if (!inviteOperation.exists) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "RequestInvite operation does not exist."
    );
  }
  if (!trustOperation.exists) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Trust operation does not exist."
    );
  }
  if (!invitedMember.exists) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invited member does not exist."
    );
  }

  if (
    !(
      inviteOperation.get("creator_uid") === invitedMember.id &&
      inviteOperation.get("data.to_uid") === loggedInMember.id
    )
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid invite operation.");
  }
  if (
    !(
      trustOperation.get("creator_uid") === loggedInMember.id &&
      trustOperation.get("data.to_uid") === invitedMember.id
    )
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid trust operation.");
  }
  if (
    !(invitedMember.get("request_invite_from_member_id") === loggedInMember.id)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Member was not invited by you."
    );
  }

  if (bigAmount.gt(RAHA_REFERRAL_BONUS)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Mint amount exceeds current Raha Referral bonus."
    );
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
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Bonus has already been minted for this referral."
    );
  }

  return {
    type: MintType.REFERRAL_BONUS,
    amount: bigAmount.toString(),
    invite_operation_id: inviteOperation.id,
    trust_operation_id: trustOperation.id,
    invited_member_id: invitedMember.id
  };
}

export const mint = (
  db: Firestore,
  members: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<MintApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInUid = loggedInMemberToken.user.uid;
      const loggedInMember = await transaction.get(members.doc(loggedInUid));

      const { type, amount } = call.body;
      // Round to 2 decimal places and using rounding mode 0 = round down.
      const bigAmount = new Big(amount).round(2, 0);

      let mintData;
      if (call.body.type === MintType.BASIC_INCOME) {
        mintData = mintBasicIncome(loggedInMember, bigAmount);
      } else if (call.body.type === MintType.REFERRAL_BONUS) {
        const {
          invite_operation_id,
          trust_operation_id,
          invited_member_id
        } = call.body;
        mintData = await mintReferralBonus(
          transaction,
          operations,
          members,
          loggedInMember,
          bigAmount,
          invite_operation_id,
          trust_operation_id,
          invited_member_id
        );
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid mint type.");
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
      transaction
        .update(loggedInMember.ref, memberUpdate)
        .set(newOperationRef, newOperation);
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
