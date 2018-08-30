import * as httpStatus from "http-status";

import { RahaApiError } from "../../..";
import { MemberId } from "../../../../../models/identifiers";

export const ERROR_CODE = "mint.referral.notVerified";
export interface NotVerifiedErrorBody {
  errorCode: typeof ERROR_CODE;
  memberId: MemberId;
}

/**
 * Member tries to redeem referral bonus without completing the invite flow by
 * verifying the new member.
 */
export class NotVerifiedError extends RahaApiError<
  typeof ERROR_CODE,
  NotVerifiedErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(memberId: MemberId) {
    super(httpStatus.FORBIDDEN, "You have not verified this member.", {
      errorCode: "mint.referral.notVerified",
      memberId
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, NotVerifiedError.prototype);
  }
}
