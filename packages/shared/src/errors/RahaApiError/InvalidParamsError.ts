import * as httpStatus from "http-status";

import { RahaApiError } from ".";
import { getHttpStatusText } from "../../helpers/http";

export const ERROR_CODE = "invalidParams";
export interface InvalidParamsDetail {
  name: string;
  message: string;
}
export interface InvalidParamsErrorBody {
  errorCode: typeof ERROR_CODE;
  invalidParams: InvalidParamsDetail[];
}

/**
 * Represents invalid parameters in the body of an API request.
 */
export class InvalidParamsError extends RahaApiError<
  typeof ERROR_CODE,
  InvalidParamsErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(invalidParams: InvalidParamsDetail[]) {
    super(httpStatus.BAD_REQUEST, getHttpStatusText(httpStatus.NOT_FOUND), {
      errorCode: "invalidParams",
      invalidParams
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, InvalidParamsError.prototype);
  }
}
