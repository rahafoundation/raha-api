import { ApiCallError } from ".";
import { ApiCall } from "../../shared/types/ApiEndpoint/ApiCall";
import * as urlJoin from "url-join";

function apiCallToString(apiBase: string, apiCall: ApiCall) {
  const { uri, method } = apiCall.location;
  const url = urlJoin(apiBase, uri);
  return `${method} ${url}`;
}

export class InvalidApiRequestError extends ApiCallError {
  public readonly apiCall: ApiCall;

  constructor(apiBase: string, failedApiCall: ApiCall) {
    super(
      `${apiCallToString(apiBase, failedApiCall)} ${
        failedApiCall.request.params
          ? `with params ${JSON.stringify(failedApiCall.request.params)}`
          : ""
      } ${
        failedApiCall.request.body
          ? `and with body ${JSON.stringify(failedApiCall.request.body)}`
          : ""
      } was called improperly; it may be missing a url param.`
    );

    this.apiCall = failedApiCall;

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, InvalidApiRequestError.prototype);
  }
}
