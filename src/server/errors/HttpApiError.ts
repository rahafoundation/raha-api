import { ApplicationError } from "./ApplicationError";
import {
  HttpStatusCode,
  getHttpStatusText
} from "../../shared/types/helpers/http";

function generateErrorMessage(statusCode: HttpStatusCode, message: string) {
  return `${statusCode} ${getHttpStatusText(statusCode)}: ${message}`;
}

/**
 * General error that the API can convert into an error API response.
 */
export class HttpApiError<ErrorData extends {} = {}> extends ApplicationError {
  public readonly statusCode: HttpStatusCode;
  public readonly errorMessage: string;
  public readonly data: ErrorData;

  /**
   * @param statusCode HTTP status code of error
   * @param message If provided, custom message; else, default message for
   * status code (i.e. 400 => Bad Request)
   */
  constructor(statusCode: HttpStatusCode, message: string, data: ErrorData) {
    super(generateErrorMessage(statusCode, message));

    this.statusCode = statusCode;
    this.errorMessage = message;
    this.data = data;

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, HttpApiError.prototype);
  }
}
