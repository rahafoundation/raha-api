import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "trust.alreadyTrusted";
export interface AlreadyTrustedErrorBody {
  errorCode: typeof ERROR_CODE;
  memberId: string;
}

/**
 * Member trusts another member that they already trust.
 *
 * TODO: should this be an idempotent operation/this not be an error?
 */
export class AlreadyTrustedError extends RahaApiError<
  typeof ERROR_CODE,
  AlreadyTrustedErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(memberId: string) {
    super(httpStatus.BAD_REQUEST, "You have already trusted this member.", {
      errorCode: "trust.alreadyTrusted",
      memberId
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, AlreadyTrustedError.prototype);
  }
}
