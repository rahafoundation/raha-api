import * as httpStatus from "http-status";

import { RahaApiError } from ".";
import { getHttpStatusText } from "../../helpers/http";

export const ERROR_CODE = "notFound";
export interface MissingParamsErrorBody {
  errorCode: typeof ERROR_CODE;
  missingParams: string[];
}

/**
 * Represents missing parameters in the body of an API request.
 */
export class MissingParamsError extends RahaApiError<
  typeof ERROR_CODE,
  MissingParamsErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(missingParams: string[]) {
    super(httpStatus.BAD_REQUEST, getHttpStatusText(httpStatus.NOT_FOUND), {
      errorCode: "notFound",
      missingParams
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, MissingParamsError.prototype);
  }
}
