import * as urlJoin from "url-join";

import { HttpVerb } from "@raha/api-shared/helpers/http";
import { ApiEndpoint } from "@raha/api-shared/routes/ApiEndpoint";
import { InvalidApiRequestError } from "./errors/InvalidApiRequestError";
import { NetworkError } from "./errors/NetworkError";
import { UnauthenticatedError } from "./errors/UnauthenticatedError";
import { ApiCallFailedError } from "./errors/ApiCallFailedError";

/**
 * The location of an API endpoint, with a full url to query and parameters
 * resolved.
 */
interface ResolvedApiEndpointSpec {
  url: string;
  method: HttpVerb;
}

/**
 * Determines the URL and HTTP method for an API call.
 *
 * Searches the URI for wildcards (denoted by path values that start with a
 * colon, like /members/:memberId) and replaces them with matching named params.
 * Also prepends the API's base URL.
 */
function resolveApiEndpoint<Endpoint extends ApiEndpoint>(
  apiBase: string,
  apiCall: Endpoint["call"]
): ResolvedApiEndpointSpec {
  const { uri, method } = apiCall.location;

  const params = apiCall.request.params;
  if (!params) {
    return { url: urlJoin(apiBase, uri), method };
  }

  const wildcards = uri.split("/").filter(part => part.charAt(0) === ":");

  const resolvedUri = wildcards.reduce((memo, wildcard) => {
    const paramName = wildcard.slice(1);
    if (!(paramName in params)) {
      throw new InvalidApiRequestError(apiBase, apiCall);
    }
    const paramValue: string = (apiCall.request.params as any)[paramName];
    // TODO: [#security] is there any sanitization we need to do here?
    return memo.replace(wildcard, paramValue);
  }, uri);

  return { url: urlJoin(apiBase, resolvedUri), method };
}

/**
 * Call an API endpoint.
 *
 * @throws ApiCallError if the API request fails
 * @throws Error if fetch fails for network reasons
 * @throws Error if JSON can't be parsed
 */
export async function callApi<Endpoint extends ApiEndpoint>(
  apiBase: string,
  apiCall: Endpoint["call"],
  authToken: Endpoint["call"]["location"]["authenticated"] extends true
    ? string
    : undefined
): Promise<Endpoint["response"]> {
  const { url, method } = resolveApiEndpoint(apiBase, apiCall);
  const requestOptions: RequestInit = {
    method,
    cache: "no-cache",
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      "content-type": "application/json"
    },
    ...(apiCall.request.body
      ? { body: JSON.stringify(apiCall.request.body) }
      : {})
  };

  let res: Response;
  try {
    res = await fetch(url, requestOptions);
  } catch (err) {
    throw new NetworkError(err);
  }

  if (res.status === 403) {
    throw new UnauthenticatedError();
  }

  if (res.status > 399) {
    throw new ApiCallFailedError(url, requestOptions, res);
  }
  try {
    const responseData = await res.json();
    return { status: res.status as any, body: responseData };
  } catch (err) {
    // TODO: real logging, and probably alerting on this too.
    // tslint:disable-next-line:no-console
    console.error(
      "Response was not valid JSON! This is unexpected and something is probably wrong on our end.",
      err
    );
    throw err;
  }
}
