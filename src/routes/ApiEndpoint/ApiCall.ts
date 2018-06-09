import ApiEndpoint from ".";

/**
 * Definition for the arguments you need to call a particular API endpoint. Also
 * includes whether or not the user must be authenticated when it's called.
 */
export interface ApiCallDefinition<
  Params,
  Body,
  Authenticated extends boolean
> {
  params: Params;
  body: Body;
  authenticated: Authenticated;
}

type ApiCall = ApiEndpoint["call"];
export default ApiCall;
