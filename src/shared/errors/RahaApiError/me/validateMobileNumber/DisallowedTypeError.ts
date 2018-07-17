import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "validateMobileNumber.disallowedType";
export interface DisallowedTypeErrorBody {
  errorCode: typeof ERROR_CODE;
  mobileNumber: string;
  foundType: string;
  validTypes: ["mobile"];
}

/**
 * Phone number is not a proper mobile number (i.e. is voip or landline)
 */
export class DisallowedTypeError extends RahaApiError<
  typeof ERROR_CODE,
  DisallowedTypeErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(mobileNumber: string, foundType: string) {
    super(
      httpStatus.BAD_REQUEST,
      `We do not accept ${foundType} phone numbers; please provide a mobile phone number.`,
      {
        errorCode: "validateMobileNumber.disallowedType",
        mobileNumber,
        foundType,
        validTypes: ["mobile"]
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, DisallowedTypeError.prototype);
  }
}
