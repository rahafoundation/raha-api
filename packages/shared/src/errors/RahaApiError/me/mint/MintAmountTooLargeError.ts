import Big from "big.js";
import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "mint.amountTooLarge";
export interface MintAmountTooLargeErrorBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Member attempts to mint more Raha than they can.
 */
export class MintAmountTooLargeError extends RahaApiError<
  typeof ERROR_CODE,
  MintAmountTooLargeErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(amount: Big, allowedAmount: Big) {
    super(
      httpStatus.BAD_REQUEST,
      `Mint amount of ${amount.toString()} exceeds the allowed amount of ${allowedAmount.toString()}.`,
      {
        errorCode: "mint.amountTooLarge"
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, MintAmountTooLargeError.prototype);
  }
}
