import { URL } from "url";
import Big from "big.js";
import { firestore } from "firebase-admin";
import { CollectionReference, Firestore } from "@google-cloud/firestore";

import { Config } from "../../config/prod.config";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import {
  MintBasicIncomePayload,
  MintType,
  MintReferralBonusPayload,
  OperationType,
  OperationToBeCreated
} from "@raha/api-shared/dist/models/Operation";
import { createApiRoute } from "..";
import { OperationApiResponseBody } from "@raha/api-shared/dist/routes/ApiEndpoint/ApiResponse";
import {
  SendInviteApiEndpoint,
  MintApiEndpoint,
  ValidateMobileNumberApiEndpoint,
  SendAppInstallTextApiEndpoint,
  SetFcmTokenApiEndpoint,
  ClearFcmTokenApiEndpoint
} from "@raha/api-shared/dist/routes/me/definitions";
import { twilioClient } from "../../twilio";
import { InviterMustBeInvitedError } from "@raha/api-shared/dist/errors/RahaApiError/me/sendInvite/InviterMustBeInvited";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { MintAmountTooLargeError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/MintAmountTooLargeError";
import { NotFoundError } from "@raha/api-shared/dist/errors/RahaApiError/NotFoundError";
import { NotInvitedError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/referral/NotInvitedError";
import { NotVerifiedError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/referral/NotVerifiedError";
import { AlreadyMintedError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/referral/AlreadyMintedError";
import { MintInvalidTypeError } from "@raha/api-shared/dist/errors/RahaApiError/me/mint/MintInvalidTypeError";
import { InvalidNumberError } from "@raha/api-shared/dist/errors/RahaApiError/me/validateMobileNumber/InvalidNumberError";
import { NotRealError } from "@raha/api-shared/dist/errors/RahaApiError/me/validateMobileNumber/NotRealError";
import { DisallowedTypeError } from "@raha/api-shared/dist/errors/RahaApiError/me/validateMobileNumber/DisallowedTypeError";
import { ServerError } from "@raha/api-shared/dist/errors/RahaApiError/ServerError";
import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";
import {
  getPublicInviteVideoUrlForMember,
  getPublicInviteVideoThumbnailRefForMember
} from "../members";

const RAHA_UBI_WEEKLY_RATE = 10;
const RAHA_REFERRAL_BONUS = 60;
const MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

type OperationToInsert = OperationToBeCreated & {
  created_at: firestore.FieldValue;
};

interface DynamicTemplateData {
  inviter_fullname: string;
  invite_link: string;
  invite_token: string;
  invite_video_url: string;
  invite_video_thumbnail: string;
}

interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  dynamic_template_data: DynamicTemplateData;
  template_id: string;
}

export const sendInvite = (
  config: Config,
  sgMail: { send: (message: EmailMessage) => void },
  members: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<SendInviteApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInMemberId = loggedInMemberToken.uid;
    const loggedInMember = await members.doc(loggedInMemberId).get();

    const { inviteEmail, videoToken, isJointVideo } = call.body;

    if (!loggedInMember.exists) {
      throw new InviterMustBeInvitedError();
    }

    const requiredParams = {
      inviteEmail,
      videoToken,
      isJointVideo
    };
    const missingParams = (Object.keys(requiredParams) as Array<
      keyof typeof requiredParams
    >).filter(key => requiredParams[key] === undefined);
    if (missingParams.length !== 0) {
      throw new MissingParamsError(missingParams);
    }

    // TODO generate this server side somewhere.
    const inviteToken = videoToken;

    const newInvite: OperationToInsert = {
      creator_uid: loggedInMemberId,
      op_code: OperationType.INVITE,
      created_at: firestore.FieldValue.serverTimestamp(),
      data: {
        invite_token: inviteToken,
        is_joint_video: isJointVideo,
        video_token: inviteToken
      }
    };
    await operations.doc().create(newInvite);

    const loggedInFullName = loggedInMember.get("full_name");

    // Deeplink invite url.
    const inviteLink = new URL(
      `/invite?t=${inviteToken}`,
      `https://to.raha.app`
    ).toString();

    const msg = {
      to: inviteEmail,
      from: "invites@raha.app",
      subject: `${loggedInFullName} invited you to join Raha!`,
      dynamic_template_data: {
        inviter_fullname: `${loggedInFullName}`,
        invite_link: `${inviteLink}`,
        invite_token: `${inviteToken}`,
        invite_video_thumbnail: getPublicInviteVideoThumbnailRefForMember(
          config,
          inviteToken
        ),
        invite_video_url: getPublicInviteVideoUrlForMember(config, inviteToken)
      },
      template_id: "d-9b939b9d11d74d1bb25901acc4517f49"
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
  const maxMintable = new Big(RAHA_UBI_WEEKLY_RATE)
    .times(sinceLastMinted)
    .div(MILLISECONDS_PER_WEEK);

  if (bigAmount.gt(maxMintable)) {
    throw new MintAmountTooLargeError(bigAmount, maxMintable);
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
          " iOS: https://itunes.apple.com/app/raha/id1434224783?ls=1&mt=8",
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
      throw new ServerError("There was an error sending the install text.");
    }

    return { body: { message: "Install link sent!" }, status: 200 };
  });

/**
 * Clear all references to a given FCM token. Called when a user logs out
 * so they don't keep receiving push notifications.
 */
export const clearFcmToken = (fcmTokens: CollectionReference) =>
  createApiRoute<ClearFcmTokenApiEndpoint>(async call => {
    const { fcmToken } = call.body;
    if (!fcmToken) {
      throw new MissingParamsError(["fcmToken"]);
    }

    // No need to wait for all the promises to return. Let them finish as they will.
    (await fcmTokens.where("fcm_token", "==", fcmToken).get()).forEach(
      async doc => {
        try {
          doc.ref.delete();
        } catch (exception) {
          // tslint:disable-next-line:no-console
          console.error(exception);
        }
      }
    );

    return {
      body: { message: "Removing all references to this FCM token." },
      status: 200
    };
  });

/**
 * Update the fcm token for a given member.
 */
export const setFcmToken = (
  members: CollectionReference,
  fcmTokens: CollectionReference
) =>
  createApiRoute<SetFcmTokenApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInUid = loggedInMemberToken.uid;
    const loggedInMember = await members.doc(loggedInUid).get();

    if (!loggedInMember) {
      throw new HttpApiError(
        403,
        "User must have an associated Raha Member.",
        {}
      );
    }

    const { fcmToken } = call.body;
    if (!fcmToken) {
      throw new MissingParamsError(["fcmToken"]);
    }

    const loggedInMemberId = loggedInMember.id;
    await fcmTokens.doc(loggedInMemberId).set({
      fcm_token: call.body.fcmToken
    });
    return { body: { message: "Updated member FCM token." }, status: 201 };
  });
