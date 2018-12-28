import Big from "big.js";
import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "mint.alreadyInvitedBonus";
export interface AlreadyMintedInvitedBonusBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Member attempts to claim their bonus for being invited multiple times.
 */
export class AlreadyMintedInvitedBonus extends RahaApiError<
  typeof ERROR_CODE,
  AlreadyMintedInvitedBonusBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(amount: Big, allowedAmount: Big) {
    super(
      httpStatus.BAD_REQUEST,
      "You already claimed your bonus for being invited.",
      {
        errorCode: ERROR_CODE
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, AlreadyMintedInvitedBonus.prototype);
  }
}
