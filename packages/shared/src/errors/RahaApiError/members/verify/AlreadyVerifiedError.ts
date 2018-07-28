import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "verify.alreadyVerified";
export interface AlreadyVerifiedErrorBody {
  errorCode: typeof ERROR_CODE;
  memberId: string;
}

/**
 * Member verifies another member that they already verifiy.
 *
 * TODO: should this be an idempotent operation/this not be an error?
 */
export class AlreadyVerifiedError extends RahaApiError<
  typeof ERROR_CODE,
  AlreadyVerifiedErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(memberId: string) {
    super(
      httpStatus.FORBIDDEN,
      "You have already verified this member's identity.",
      {
        errorCode: "verify.alreadyVerified",
        memberId
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, AlreadyVerifiedError.prototype);
  }
}
