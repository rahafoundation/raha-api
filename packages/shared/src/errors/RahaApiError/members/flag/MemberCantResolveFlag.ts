import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "flagMember.memberCantResolveFlag";
export interface MemberCantResolveFlagErrorBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Member cannot flag according to the logic defined in abilities.
 */
export class MemberCantResolveFlagError extends RahaApiError<
  typeof ERROR_CODE,
  MemberCantResolveFlagErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor() {
    super(
      httpStatus.FORBIDDEN,
      "Member does not have the ability to resolve flag.",
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
    Object.setPrototypeOf(this, MemberCantResolveFlagError.prototype);
  }
}
