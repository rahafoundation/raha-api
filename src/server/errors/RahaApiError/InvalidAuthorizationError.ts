import * as httpStatus from "http-status";

import { RahaApiError } from ".";

export interface InvalidAuthorizationErrorBody {
  errorCode: "invalidAuthorization";
}

/**
 * Unable to validate the credentials sent with an API request.
 */
export class InvalidAuthorizationError extends RahaApiError<
  InvalidAuthorizationErrorBody
> {
  constructor() {
    super(
      httpStatus.FORBIDDEN,
      "Unable to authorize the member with supplied credentials",
      {
        errorCode: "invalidAuthorization"
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, InvalidAuthorizationError.prototype);
  }
}
