import * as httpStatus from "http-status";

import { RahaApiError } from ".";
import { getHttpStatusText } from "../../helpers/http";

export const ERROR_CODE = "unauthorized";
export interface UnauthorizedErrorBody {
  errorCode: typeof ERROR_CODE;
}

/**
 * Authentication required to take the action requested via the API.
 */
export class UnauthorizedError extends RahaApiError<
  typeof ERROR_CODE,
  UnauthorizedErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor() {
    super(httpStatus.UNAUTHORIZED, getHttpStatusText(httpStatus.UNAUTHORIZED), {
      errorCode: "unauthorized"
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
