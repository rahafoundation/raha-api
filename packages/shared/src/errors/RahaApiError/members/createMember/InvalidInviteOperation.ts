import * as httpStatus from "http-status";

import { RahaApiError } from "../..";

export const ERROR_CODE = "createMember.invalidInviteOperation";
export interface InvalidInviteOperationErrorBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Invite operation does not contain required fields.
 */
export class InvalidInviteOperationError extends RahaApiError<
  typeof ERROR_CODE,
  InvalidInviteOperationErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor() {
    super(
      httpStatus.INTERNAL_SERVER_ERROR,
      "The specified invite appears to be invalid. This should not be possible and indicates a bug.",
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
    Object.setPrototypeOf(this, InvalidInviteOperationError.prototype);
  }
}
