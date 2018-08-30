import * as httpStatus from "http-status";

import { RahaApiError } from "../../..";
import { MemberId } from "../../../../../models/identifiers";

export const ERROR_CODE = "mint.referral.alreadyMinted";
export interface AlreadyMintedErrorBody {
  errorCode: typeof ERROR_CODE;
  memberId: MemberId;
}

/**
 * Member tries to redeem referral bonus they have already redeemed
 */
export class AlreadyMintedError extends RahaApiError<
  typeof ERROR_CODE,
  AlreadyMintedErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(memberId: MemberId) {
    super(
      httpStatus.BAD_REQUEST,
      "You already minted your bonus for this member.",
      {
        errorCode: "mint.referral.alreadyMinted",
        memberId
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, AlreadyMintedError.prototype);
  }
}
