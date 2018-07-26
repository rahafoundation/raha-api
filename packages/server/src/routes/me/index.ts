import { URL } from "url";
import Big from "big.js";
import { firestore } from "firebase-admin";
import { CollectionReference, Firestore } from "@google-cloud/firestore";

import { Config } from "../../config/prod.config";
import { MemberId } from "@raha/api-shared/models/identifiers";
import {
  MintBasicIncomePayload,
  MintType,
  MintReferralBonusPayload,
  OperationType
} from "@raha/api-shared/models/Operation";
import { createApiRoute } from "..";
import { OperationApiResponseBody } from "@raha/api-shared/routes/ApiEndpoint/ApiResponse";
import {
  SendInviteApiEndpoint,
  MintApiEndpoint,
  ValidateMobileNumberApiEndpoint,
  SendAppInstallTextApiEndpoint
} from "@raha/api-shared/routes/me/definitions";
import { twilioClient } from "../../twilio";
import { InviterMustBeInvitedError } from "@raha/api-shared/errors/RahaApiError/me/sendInvite/InviterMustBeInvited";
import { MissingParamsError } from "@raha/api-shared/errors/RahaApiError/MissingParamsError";
import { MintAmountTooLargeError } from "@raha/api-shared/errors/RahaApiError/me/mint/MintAmountTooLargeError";
import { NotFoundError } from "@raha/api-shared/errors/RahaApiError/NotFoundError";
import { NotInvitedError } from "@raha/api-shared/errors/RahaApiError/me/mint/referral/NotInvitedError";
import { NotTrustedError } from "@raha/api-shared/errors/RahaApiError/me/mint/referral/NotTrustedError";
import { AlreadyMintedError } from "@raha/api-shared/errors/RahaApiError/me/mint/referral/AlreadyMintedError";
import { MintInvalidTypeError } from "@raha/api-shared/errors/RahaApiError/me/mint/MintInvalidTypeError";
import { InvalidNumberError } from "@raha/api-shared/errors/RahaApiError/me/validateMobileNumber/InvalidNumberError";
import { NotRealError } from "@raha/api-shared/errors/RahaApiError/me/validateMobileNumber/NotRealError";
import { DisallowedTypeError } from "@raha/api-shared/errors/RahaApiError/me/validateMobileNumber/DisallowedTypeError";
import { ServerError } from "@raha/api-shared/errors/RahaApiError/ServerError";

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

    const { inviteEmail, videoToken } = call.body;

    if (!loggedInMember.exists) {
      throw new InviterMustBeInvitedError();
    }

    if (!inviteEmail) {
      throw new MissingParamsError(["inviteEmail"]);
    }

    const loggedInFullName = loggedInMember.get("full_name");
    const loggedInUsername = loggedInMember.get("username");

    // If there is already a videoToken, give them the deeplink format.
    const inviteLink = videoToken
      ? new URL(
          `/invite?r=${loggedInUsername}&t=${videoToken}`,
          `https://raha.app`
        ).toString()
      : new URL(`/m/${loggedInUsername}/invite`, config.appBase).toString();

    const webInstructionsText = `Visit ${inviteLink} to join Raha!`;
    const webInstructionsHtml = `<span><strong>Visit <a href="${inviteLink}">${inviteLink}</a> to join Raha!</strong></span>`;

    const mobileInstructionsText =
      "1. Download the app:\n" +
      "  Android: https://play.google.com/store/apps/details?id=app.raha.mobile" +
      "  iOS: Please hang tight! The iOS app is on the way." +
      "\n\n" +
      `2. Click on your invite link to join: ${inviteLink}`;
    const mobileInstructionsHtml =
      "<ol><li>Download the app for <a href='https://play.google.com/store/apps/details?id=app.raha.mobile'>Android</a>. (Please hang tight! The iOS app is on the way.)</li>" +
      `<li>Click on your invite link to join: <a href="${inviteLink}">${inviteLink}</a></li>` +
      "</ol>";

    // We use the existence of the videoToken to determine whether the user is
    // inviting from mobile or from the web. From mobile, we will always include
    // a video. If this assumption changes, please update.
    const instructionsText = videoToken
      ? mobileInstructionsText
      : webInstructionsText;
    const instructionsHtml = videoToken
      ? mobileInstructionsHtml
      : webInstructionsHtml;

    const msg = {
      to: inviteEmail,
      from: "invites@raha.app",
      subject: `${loggedInFullName} invited you to join Raha!`,
      text:
        "Raha is the foundation for a global universal basic income. " +
        "To ensure that only real humans can join, people must be invited " +
        `by an existing member of the Raha network. ${loggedInFullName} ` +
        "has invited you to join!\n\n" +
        instructionsText,
      html:
        "<span><strong>Raha is the foundation for a global universal basic income.</strong><br /><br />" +
        "To ensure that only real humans can join, people must be invited " +
        `by an existing member of the Raha network. ${loggedInFullName} ` +
        "has invited you to join!</span><br /><br />" +
        instructionsHtml
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
    throw new MintAmountTooLargeError();
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
    throw new NotFoundError(invitedMemberId);
  }

  if (
    !(invitedMember.get("request_invite_from_member_id") === loggedInMember.id)
  ) {
    throw new NotInvitedError(invitedMemberId);
  }

  if (!invitedMember.get("invite_confirmed")) {
    throw new NotTrustedError(invitedMemberId);
  }

  if (bigAmount.gt(RAHA_REFERRAL_BONUS)) {
    throw new MintAmountTooLargeError();
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

/**
 * An endpoint to validate phone numbers.
 * Checks if it meets our requirements, notably that the number is not a
 * VOIP or landline number.
 */
export const validateMobileNumber = (config: Config) =>
  createApiRoute<ValidateMobileNumberApiEndpoint>(async call => {
    const { mobileNumber } = call.body;

    if (!mobileNumber) {
      throw new MissingParamsError(["mobileNumber"]);
    }

    let phoneNumberLookup: any;
    try {
      phoneNumberLookup = await twilioClient.lookups
        .phoneNumbers(mobileNumber)
        .fetch({ type: "carrier" });
    } catch (e) {
      // TODO: this isn't always a user error, can be an internal server error.
      // Change to reflect that in API responses
      throw new InvalidNumberError(mobileNumber);
    }

    // Skip these checks if the number is a known debug number.
    // This is a preliminary mechanism that may be useful for iOS acceptance testing
    // down the line as well.
    if (config.debugNumbers.includes(mobileNumber)) {
      return { body: { message: mobileNumber }, status: 200 };
    }

    const allowedPhoneTypes = ["mobile"];

    if (
      !phoneNumberLookup ||
      !phoneNumberLookup.phoneNumber ||
      !phoneNumberLookup.carrier ||
      !phoneNumberLookup.carrier.type
    ) {
      throw new NotRealError(mobileNumber);
    }

    if (!allowedPhoneTypes.includes(phoneNumberLookup.carrier.type)) {
      throw new DisallowedTypeError(
        mobileNumber,
        phoneNumberLookup.carrier.type
      );
    }

    return { body: { message: phoneNumberLookup.phoneNumber }, status: 200 };
  });

export const sendAppInstallText = (config: Config) =>
  createApiRoute<SendAppInstallTextApiEndpoint>(async call => {
    const { mobileNumber } = call.body;

    if (!mobileNumber) {
      throw new MissingParamsError(["mobileNumber"]);
    }

    // Skip sending text if the number is a known debug number.
    // This is a preliminary mechanism that may be useful for iOS acceptance testing
    // down the line as well.
    if (config.debugNumbers.includes(mobileNumber)) {
      return { body: { message: "Install link sent!" }, status: 200 };
    }
    try {
      await twilioClient.messages.create({
        body:
          "Hi! You can download the Raha app at the following links.\n" +
          " Android: https://play.google.com/store/apps/details?id=app.raha.mobile\n" +
          " iOS: Please hang tight! The iOS app on the way.",
        to: mobileNumber,
        from: config.twilio.fromNumber,
        // I don't think the Twilio SDK actually supports the Messaging Service feature atm.
        // Once we add multiple numbers that we'd like Twilio to use for localized text
        // messages, we should look into just making the REST API call directly.
        MessagingServiceSid: config.twilio.messagingServiceSid
      });
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
      throw new ServerError("There was a nerror sending the install text.");
    }

    return { body: { message: "Install link sent!" }, status: 200 };
  });
