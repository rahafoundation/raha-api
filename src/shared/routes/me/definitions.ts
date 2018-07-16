import { HttpVerb } from "../../types/helpers/http";
import {
  ApiEndpointDefinition,
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointUri
} from "../../types/ApiEndpoint";
import {
  OperationApiResponseBody,
  MessageApiResponseBody
} from "../../types/ApiEndpoint/ApiResponse";
import { ApiLocationDefinition } from "../../types/ApiEndpoint/ApiCall";
import { MintPayload } from "../../models/Operation";

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type SendInviteApiLocation = ApiLocationDefinition<
  ApiEndpointUri.SEND_INVITE,
  HttpVerb.POST,
  true
>;
export const sendInviteApiLocation: SendInviteApiLocation = {
  uri: ApiEndpointUri.SEND_INVITE,
  method: HttpVerb.POST,
  authenticated: true
};
export type SendInviteApiCall = ApiCallDefinition<
  SendInviteApiLocation["uri"],
  SendInviteApiLocation["method"],
  SendInviteApiLocation["authenticated"],
  void,
  { inviteEmail: string; videoToken?: string }
>;
export type SendInviteApiResponse = ApiResponseDefinition<
  201,
  MessageApiResponseBody
>;
export type SendInviteApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.SEND_INVITE,
  SendInviteApiCall,
  SendInviteApiResponse
>;

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type MintApiLocation = ApiLocationDefinition<
  ApiEndpointUri.MINT,
  HttpVerb.POST,
  true
>;
export const mintApiLocation: MintApiLocation = {
  uri: ApiEndpointUri.MINT,
  method: HttpVerb.POST,
  authenticated: true
};
export type MintApiCall = ApiCallDefinition<
  MintApiLocation["uri"],
  MintApiLocation["method"],
  MintApiLocation["authenticated"],
  void,
  MintPayload
>;
export type MintApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type MintApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.MINT,
  MintApiCall,
  MintApiResponse
>;

export interface ValidateMobileNumberPayload {
  mobileNumber: string;
}
export type ValidateMobileNumberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.VALIDATE_MOBILE_NUMBER,
  HttpVerb.POST,
  false
>;
export const validateMobileNumberApiLocation: ValidateMobileNumberApiLocation = {
  uri: ApiEndpointUri.VALIDATE_MOBILE_NUMBER,
  method: HttpVerb.POST,
  authenticated: false
};
export type ValidateMobileNumberApiCall = ApiCallDefinition<
  ValidateMobileNumberApiLocation["uri"],
  ValidateMobileNumberApiLocation["method"],
  ValidateMobileNumberApiLocation["authenticated"],
  void,
  ValidateMobileNumberPayload
>;
export type ValidateMobileNumberApiResponse = ApiResponseDefinition<
  200,
  MessageApiResponseBody
>;
export type ValidateMobileNumberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.VALIDATE_MOBILE_NUMBER,
  ValidateMobileNumberApiCall,
  ValidateMobileNumberApiResponse
>;
