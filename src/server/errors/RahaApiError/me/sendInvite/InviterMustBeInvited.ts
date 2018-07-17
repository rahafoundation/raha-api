import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export interface InviterMustBeInvitedErrorBody {
  errorCode: "sendInvite.inviterMustBeInvited";
}

/**
 * Member attempts to invite someone without themsevles having first been
 * invited.
 */
export class InviterMustBeInvitedError extends RahaApiError<
  InviterMustBeInvitedErrorBody
> {
  constructor() {
    super(
      httpStatus.FORBIDDEN,
      "You must yourself have been invited to Raha to send invites.",
      {
        errorCode: "sendInvite.inviterMustBeInvited"
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, InviterMustBeInvitedError.prototype);
  }
}
