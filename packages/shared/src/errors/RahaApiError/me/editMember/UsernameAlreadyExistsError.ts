import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "mint.referral.usernameAlreadyExists";
export interface UsernameAlreadyExistsErrorBody {
  errorCode: typeof ERROR_CODE;
  username: string;
}

/**
 * Member tries to redeem referral bonus they have already redeemed
 */
export class UsernameAlreadyExistsError extends RahaApiError<
  typeof ERROR_CODE,
  UsernameAlreadyExistsErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(username: string) {
    super(
      httpStatus.BAD_REQUEST,
      `The username, ${username}, already exists.`,
      {
        errorCode: "mint.referral.usernameAlreadyExists",
        username
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, UsernameAlreadyExistsError.prototype);
  }
}
