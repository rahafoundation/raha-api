import * as httpStatus from "http-status";

import { RahaApiError } from ".";
import { getHttpStatusText } from "../../../shared/types/helpers/http";

export interface ServerErrorBody {
  errorCode: "serverError";
  description: string;
}

/**
 * Internal error in processing an API request.
 */
export class ServerError extends RahaApiError<ServerErrorBody> {
  constructor(description: string) {
    super(
      httpStatus.INTERNAL_SERVER_ERROR,
      getHttpStatusText(httpStatus.INTERNAL_SERVER_ERROR),
      { errorCode: "serverError", description }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}
