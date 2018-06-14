import { ApiEndpoint, ApiEndpointUri } from ".";
import { HttpVerb } from "../../helpers/http";

export interface ApiLocationDefinition<
  Uri extends ApiEndpointUri,
  Method extends HttpVerb,
  Authenticated extends boolean
> {
  uri: Uri;
  method: Method;
  authenticated: Authenticated;
}

export interface ApiRequest<Params, Body> {
  params: Params;
  body: Body;
}

/**
 * Definition for how to call a particular API endpoint, including its location,
 * parameters and body. Also includes whether or not the user must be
 * authenticated when it's called.
 */
export interface ApiCallDefinition<
  Uri extends ApiEndpointUri,
  Method extends HttpVerb,
  Authenticated extends boolean,
  Params,
  Body
> {
  location: ApiLocationDefinition<Uri, Method, Authenticated>;
  request: ApiRequest<Params, Body>;
}

export type ApiCall = ApiEndpoint["call"];
export type ApiLocation = ApiCall["location"];
