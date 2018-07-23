import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "validateMobileNumber.notReal";
export interface NotRealErrorBody {
  errorCode: typeof ERROR_CODE;
  mobileNumber: string;
}

/**
 * Phone number is valid but doesn't appear to correspond to a real phone number
 */
export class NotRealError extends RahaApiError<
  typeof ERROR_CODE,
  NotRealErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(mobileNumber: string) {
    super(
      httpStatus.BAD_REQUEST,
      "Your number does not appear to be a real number.",
      {
        errorCode: "validateMobileNumber.notReal",
        mobileNumber
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, NotRealError.prototype);
  }
}
