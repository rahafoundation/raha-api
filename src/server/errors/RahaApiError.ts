import * as httpStatus from "http-status";

import { HttpApiError } from "./HttpApiError";
import {
  getHttpStatusText,
  HttpStatusCode
} from "../../shared/types/helpers/http";
import { MemberId } from "../../shared/models/identifiers";
import { MintType } from "../../shared/models/Operation";

export enum ErrorCode {
  INVALID_AUTHORIZATION = "invalidAuthorization",
  UNAUTHORIZED = "unauthorized",
  MISSING_PARAMS = "missingParams",
  NOT_FOUND = "notFound",

  SEND_INVITE__INVITER_MUST_BE_INVITED = "sendInvite.inviterMustBeInvited",

  MINT__AMOUNT_TOO_LARGE = "mint.amountTooLarge",
  MINT__INVALID_TYPE = "mint.invalidType",
  MINT__REFERRAL__NOT_INVITED = "mint.referral.notInvited",
  MINT__REFERRAL__NOT_TRUSTED = "mint.referral.notTrusted",
  MINT__REFERRAL__ALREADY_MINTED = "mint.referral.alreadyMinted",

  VALIDATE_MOBILE_NUMBER__INVALID_NUMBER = "validateMobileNumber.invalidNumber",
  VALIDATE_MOBILE_NUMBER__NOT_REAL_NUMBER = "validateMobileNumber.notRealNumber",
  VALIDATE_MOBILE_NUMBER__DISALLOWED_TYPE = "validateMobileNumber.disallowedType",

  REQUEST_INVITE__ALREADY_REQUESTED = "requestInvite.alreadyRequested",

  TRUST__ALREADY_TRUSTED = "trust.alreadyTrusted",

  GIVE__INSUFFICIENT_BALANCE = "give.insufficientBalance"
}

const errorCodeToStatusCode: { [K in ErrorCode]: HttpStatusCode } = {
  [ErrorCode.INVALID_AUTHORIZATION]: httpStatus.FORBIDDEN,
  [ErrorCode.UNAUTHORIZED]: httpStatus.UNAUTHORIZED,
  [ErrorCode.MISSING_PARAMS]: httpStatus.BAD_REQUEST,
  [ErrorCode.NOT_FOUND]: httpStatus.NOT_FOUND,

  [ErrorCode.SEND_INVITE__INVITER_MUST_BE_INVITED]: httpStatus.FORBIDDEN,

  [ErrorCode.MINT__AMOUNT_TOO_LARGE]: httpStatus.FORBIDDEN,
  [ErrorCode.MINT__INVALID_TYPE]: httpStatus.BAD_REQUEST,
  [ErrorCode.MINT__REFERRAL__NOT_INVITED]: httpStatus.FORBIDDEN,
  [ErrorCode.MINT__REFERRAL__NOT_TRUSTED]: httpStatus.FORBIDDEN,
  [ErrorCode.MINT__REFERRAL__ALREADY_MINTED]: httpStatus.FORBIDDEN,

  [ErrorCode.VALIDATE_MOBILE_NUMBER__INVALID_NUMBER]: httpStatus.BAD_REQUEST,
  [ErrorCode.VALIDATE_MOBILE_NUMBER__NOT_REAL_NUMBER]: httpStatus.BAD_REQUEST,
  [ErrorCode.VALIDATE_MOBILE_NUMBER__DISALLOWED_TYPE]: httpStatus.BAD_REQUEST,

  [ErrorCode.REQUEST_INVITE__ALREADY_REQUESTED]: httpStatus.FORBIDDEN,

  [ErrorCode.TRUST__ALREADY_TRUSTED]: httpStatus.FORBIDDEN,

  [ErrorCode.GIVE__INSUFFICIENT_BALANCE]: httpStatus.FORBIDDEN
};

const errorCodeToMessage: { [K in ErrorCode]: string } = {
  [ErrorCode.INVALID_AUTHORIZATION]: getHttpStatusText(httpStatus.FORBIDDEN),
  [ErrorCode.UNAUTHORIZED]: getHttpStatusText(httpStatus.UNAUTHORIZED),
  [ErrorCode.MISSING_PARAMS]: "Missing required params.",
  [ErrorCode.NOT_FOUND]: getHttpStatusText(httpStatus.NOT_FOUND),

  [ErrorCode.SEND_INVITE__INVITER_MUST_BE_INVITED]:
    "You must yourself have been invited to Raha to send invites.",

  [ErrorCode.MINT__AMOUNT_TOO_LARGE]: "Mint amount exceeds the allowed amount.",
  [ErrorCode.MINT__INVALID_TYPE]: "Mint type was invalid.",
  [ErrorCode.MINT__REFERRAL__NOT_TRUSTED]: "You have not trusted this member.",
  [ErrorCode.MINT__REFERRAL__NOT_INVITED]: "Member was not invited by you.",
  [ErrorCode.MINT__REFERRAL__ALREADY_MINTED]:
    "Bonus has already been minted for this referral.",

  [ErrorCode.VALIDATE_MOBILE_NUMBER__INVALID_NUMBER]:
    "The supplied mobile number could not be validated.",
  [ErrorCode.VALIDATE_MOBILE_NUMBER__NOT_REAL_NUMBER]:
    "Your number does not appear to be a real number.",
  [ErrorCode.VALIDATE_MOBILE_NUMBER__DISALLOWED_TYPE]:
    "We do not accept numbers of that type; please provide a mobile phone number.",

  [ErrorCode.REQUEST_INVITE__ALREADY_REQUESTED]:
    "You have already requested an invite.",

  [ErrorCode.TRUST__ALREADY_TRUSTED]: "You have already trusted this member.",

  [ErrorCode.GIVE__INSUFFICIENT_BALANCE]: "Amount exceeds account balance."
};

type ErrorData =
  | { errorCode: ErrorCode.INVALID_AUTHORIZATION }
  | { errorCode: ErrorCode.UNAUTHORIZED }
  | { errorCode: ErrorCode.MISSING_PARAMS; missingParams: string[] }
  | { errorCode: ErrorCode.NOT_FOUND; id?: string; description?: string }
  | { errorCode: ErrorCode.SEND_INVITE__INVITER_MUST_BE_INVITED }
  | {
      errorCode: ErrorCode.MINT__INVALID_TYPE;
      inputtedType: string;
      validTypes: MintType[];
    }
  | { errorCode: ErrorCode.MINT__AMOUNT_TOO_LARGE }
  | {
      errorCode: ErrorCode.MINT__REFERRAL__NOT_INVITED;
      invitedMemberId: MemberId;
    }
  | {
      errorCode: ErrorCode.MINT__REFERRAL__NOT_TRUSTED;
      invitedMemberId: MemberId;
    }
  | {
      errorCode: ErrorCode.MINT__REFERRAL__ALREADY_MINTED;
      invitedMemberId: MemberId;
    }
  | {
      errorCode: ErrorCode.VALIDATE_MOBILE_NUMBER__INVALID_NUMBER;
      mobileNumber: string;
    }
  | {
      errorCode: ErrorCode.VALIDATE_MOBILE_NUMBER__DISALLOWED_TYPE;
      mobileNumber: string;
      phoneType: string;
    }
  | {
      errorCode: ErrorCode.VALIDATE_MOBILE_NUMBER__NOT_REAL_NUMBER;
      mobileNumber: string;
    }
  | { errorCode: ErrorCode.REQUEST_INVITE__ALREADY_REQUESTED }
  | { errorCode: ErrorCode.TRUST__ALREADY_TRUSTED; memberId: MemberId }
  | { errorCode: ErrorCode.GIVE__INSUFFICIENT_BALANCE };

/**
 * Error that corresponds to a particular Raha API error code and response
 * structure.
 */
export class RahaApiError<Data extends ErrorData> extends HttpApiError<Data> {
  constructor(data: Data) {
    super(
      errorCodeToStatusCode[data.errorCode],
      errorCodeToMessage[data.errorCode],
      data
    );
  }
}

throw new RahaApiError({
  errorCode: ErrorCode.UNAUTHORIZED
});
