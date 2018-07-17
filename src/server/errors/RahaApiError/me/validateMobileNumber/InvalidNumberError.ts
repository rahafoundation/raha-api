import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

const ERROR_CODE = "validateMobileNumber.invalidNumber";
export interface InvalidNumberErrorBody {
  errorCode: typeof ERROR_CODE;
  mobileNumber: string;
}

/**
 * Phone number is invalid
 */
export class InvalidNumberError extends RahaApiError<
  typeof ERROR_CODE,
  InvalidNumberErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(mobileNumber: string) {
    super(
      httpStatus.BAD_REQUEST,
      "The supplied mobile number could not be validated.",
      {
        errorCode: "validateMobileNumber.invalidNumber",
        mobileNumber
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, InvalidNumberError.prototype);
  }
}
