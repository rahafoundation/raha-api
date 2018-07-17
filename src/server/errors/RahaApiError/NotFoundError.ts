import * as httpStatus from "http-status";

import { RahaApiError } from ".";
import { getHttpStatusText } from "../../../shared/types/helpers/http";

export interface NotFoundErrorBody {
  errorCode: "notFound";
  id: string;
  description?: string;
}

/**
 * Entity required to fulfill an API request not found.
 */
export class NotFoundError extends RahaApiError<NotFoundErrorBody> {
  constructor(id: string, description?: string) {
    super(httpStatus.NOT_FOUND, getHttpStatusText(httpStatus.NOT_FOUND), {
      errorCode: "notFound",
      id,
      ...(description ? { description } : {})
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
