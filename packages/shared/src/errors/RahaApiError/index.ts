import { HttpApiError } from "../HttpApiError";
import { HttpStatusCode } from "../../helpers/http";

/**
 * Error that corresponds to a particular Raha API error code and response
 * structure.
 */
export abstract class RahaApiError<
  ErrorCode extends string,
  Data extends { errorCode: ErrorCode }
> extends HttpApiError<Data> {
  abstract get errorCode(): ErrorCode;

  constructor(statusCode: HttpStatusCode, message: string, data: Data) {
    super(statusCode, message, data);

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, RahaApiError.prototype);
  }
}
