import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "mint.amountTooLarge";
export interface MintAmountTooLargeErrorBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Member attempts to give more Raha than they have available.
 */
export class MintAmountTooLargeError extends RahaApiError<
  typeof ERROR_CODE,
  MintAmountTooLargeErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor() {
    super(httpStatus.FORBIDDEN, "Mint amount exceeds the allowed amount.", {
      errorCode: "mint.amountTooLarge"
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, MintAmountTooLargeError.prototype);
  }
}
