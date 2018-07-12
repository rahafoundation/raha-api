import { URL } from "url";
import Big from "big.js";
import { firestore } from "firebase-admin";
import { CollectionReference, Firestore } from "@google-cloud/firestore";
import * as httpStatus from "http-status";

import { Config } from "../../config/prod.config";
import { ApiError } from "../../errors/ApiError";
import { MemberId } from "../../models/identifiers";
import {
  MintBasicIncomePayload,
  MintType,
  MintReferralBonusPayload,
  OperationType
} from "../../models/Operation";
import { createApiRoute } from "../";
import { OperationApiResponseBody } from "../ApiEndpoint/ApiResponse";
import {
  SendInviteApiEndpoint,
  MintApiEndpoint,
  MigrateApiEndpoint
} from "./definitions";
import { twilioClient } from "../../twilio";

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
  invitedMemberId: MemberId
): Promise<MintReferralBonusPayload> {
  const invitedMember = await transaction.get(members.doc(invitedMemberId));

  if (!invitedMember.exists) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invited member does not exist."
    );
  }

  if (
    !(invitedMember.get("request_invite_from_member_id") === loggedInMember.id)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Member was not invited by you."
    );
  }

  if (!invitedMember.get("invite_confirmed")) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You have not trusted this member."
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
      const loggedInUid = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(members.doc(loggedInUid));

      const { type, amount } = call.body;
      // Round to 2 decimal places and using rounding mode 0 = round down.
      const bigAmount = new Big(amount).round(2, 0);

      let mintData;
      if (call.body.type === MintType.BASIC_INCOME) {
        mintData = mintBasicIncome(loggedInMember, bigAmount);
      } else if (call.body.type === MintType.REFERRAL_BONUS) {
        const { invited_member_id } = call.body;
        mintData = await mintReferralBonus(
          transaction,
          operations,
          members,
          loggedInMember,
          bigAmount,
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

export const migrate = (db: Firestore, members: CollectionReference) =>
  createApiRoute<MigrateApiEndpoint>(async (call, loggedInMemberToken) => {
    const { mobileNumber } = call.body;

    if (!mobileNumber) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "You must supply a mobile number."
      );
    }

    let phoneNumberLookup: any;
    try {
      phoneNumberLookup = await twilioClient.lookups
        .phoneNumbers(mobileNumber)
        .fetch();
    } catch (e) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "The supplied mobile number could not be validated."
      );
    }

    if (!phoneNumberLookup || !phoneNumberLookup.phoneNumber) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "We ran into an error trying to extract your phone number."
      );
    }

    await db.runTransaction(async transaction => {
      const loggedInUid = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(members.doc(loggedInUid));

      if (loggedInMember.get("mobile_number") !== undefined) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "You have already associated a mobile number with your account."
        );
      }

      const memberUpdate = {
        mobile_number: phoneNumberLookup.phoneNumber
      };

      transaction.update(loggedInMember.ref, memberUpdate);
    });

    return { body: { message: "Success!" }, status: 200 };
  });
