import * as httpStatus from "http-status";

import { RahaApiError } from "../../..";
import { MemberId } from "../../../../../../shared/models/identifiers";

export interface NotInvitedErrorBody {
  errorCode: "mint.referral.notInvited";
  memberId: MemberId;
}

/**
 * Member tries to redeem referral bonus for a member they didn't invite
 */
export class NotInvitedError extends RahaApiError<NotInvitedErrorBody> {
  constructor(memberId: MemberId) {
    super(httpStatus.FORBIDDEN, "You have not invited this member.", {
      errorCode: "mint.referral.notInvited",
      memberId
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, NotInvitedError.prototype);
  }
}
