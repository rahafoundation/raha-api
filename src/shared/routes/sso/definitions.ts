import {
  ApiEndpointUri,
  ApiResponseDefinition,
  ApiEndpointDefinition,
  ApiEndpointName
} from "../../types/ApiEndpoint";
import { HttpVerb } from "../../types/helpers/http";
import {
  ApiLocationDefinition,
  ApiCallDefinition
} from "../../types/ApiEndpoint/ApiCall";
import { MessageApiResponseBody } from "../../types/ApiEndpoint/ApiResponse";

export type SSODiscourseApiLocation = ApiLocationDefinition<
  ApiEndpointUri.SSO_DISCOURSE,
  // TODO: Use a GET request once querystring parameters infrastructure is implemented.
  HttpVerb.POST,
  true
>;
export const ssoDiscourseApiLocation: SSODiscourseApiLocation = {
  uri: ApiEndpointUri.SSO_DISCOURSE,
  method: HttpVerb.POST,
  authenticated: true
};
export type SSODiscourseApiCall = ApiCallDefinition<
  SSODiscourseApiLocation["uri"],
  SSODiscourseApiLocation["method"],
  SSODiscourseApiLocation["authenticated"],
  void,
  { ssoRequestPayload: string; ssoRequestSignature: string }
>;
export type SSODiscourseApiResponse = ApiResponseDefinition<
  200,
  MessageApiResponseBody
>;

export type SSODiscourseApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.SSO_DISCOURSE,
  SSODiscourseApiCall,
  SSODiscourseApiResponse
>;
