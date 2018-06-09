import ApplicationError from "./ApplicationError";
import { HttpStatusCode, getHttpStatusText } from "../helpers/http";

function generateErrorMessage(statusCode: HttpStatusCode, message?: string) {
  const baseMessage = `${statusCode} ${getHttpStatusText(statusCode)}`;
  return message ? `${baseMessage}: ${message}` : baseMessage;
}

/**
 * An error that the API can convert into an error API response
 */
export default class ApiError extends ApplicationError {
  public readonly statusCode: HttpStatusCode;
  public readonly errorMessage: string;

  /**
   * @param statusCode HTTP status code of error
   * @param message If provided, custom message; else, default message for
   * status code (i.e. 400 => Bad Request)
   */
  constructor(statusCode: HttpStatusCode, message?: string) {
    super(generateErrorMessage(statusCode, message));

    this.statusCode = statusCode;
    this.errorMessage = message ? message : getHttpStatusText(statusCode);

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
