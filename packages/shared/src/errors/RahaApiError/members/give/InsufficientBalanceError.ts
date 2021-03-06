import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "give.insufficientBalance";
export interface InsufficientBalanceErrorBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Member attempts to give more Raha than they have available.
 */
export class InsufficientBalanceError extends RahaApiError<
  typeof ERROR_CODE,
  InsufficientBalanceErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor() {
    super(httpStatus.BAD_REQUEST, "Amount exceeds account balance.", {
      errorCode: "give.insufficientBalance"
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}
