import { HttpVerb } from "../../helpers/http";
import {
  ApiEndpointDefinition,
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointUri
} from "../ApiEndpoint";
import {
  OperationApiResponseBody,
  MessageApiResponseBody
} from "../ApiEndpoint/ApiResponse";
import { ApiLocationDefinition } from "../ApiEndpoint/ApiCall";
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
  { inviteEmail: string; videoToken: string; isJointVideo: boolean }
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

export interface SendTextPayload {
  mobileNumber: string;
}
export type SendAppInstallTextApiLocation = ApiLocationDefinition<
  ApiEndpointUri.SEND_APP_INSTALL_TEXT,
  HttpVerb.POST,
  false
>;
export const sendAppInstallTextApiLocation: SendAppInstallTextApiLocation = {
  uri: ApiEndpointUri.SEND_APP_INSTALL_TEXT,
  method: HttpVerb.POST,
  authenticated: false
};
export type SendAppInstallTextApiCall = ApiCallDefinition<
  SendAppInstallTextApiLocation["uri"],
  SendAppInstallTextApiLocation["method"],
  SendAppInstallTextApiLocation["authenticated"],
  void,
  SendTextPayload
>;
export type SendAppInstallTextApiResponse = ApiResponseDefinition<
  200,
  MessageApiResponseBody
>;
export type SendAppInstallTextApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.SEND_APP_INSTALL_TEXT,
  SendAppInstallTextApiCall,
  SendAppInstallTextApiResponse
>;

export type ClearFcmTokenApiLocation = ApiLocationDefinition<
  ApiEndpointUri.CLEAR_FCM_TOKEN,
  HttpVerb.POST,
  false
>;
export const clearFcmTokenApiLocation: ClearFcmTokenApiLocation = {
  uri: ApiEndpointUri.CLEAR_FCM_TOKEN,
  method: HttpVerb.POST,
  authenticated: false
};
export type ClearFcmTokenApiCall = ApiCallDefinition<
  ClearFcmTokenApiLocation["uri"],
  ClearFcmTokenApiLocation["method"],
  ClearFcmTokenApiLocation["authenticated"],
  void,
  { fcmToken: string }
>;
export type ClearFcmTokenApiResponse = ApiResponseDefinition<
  200,
  MessageApiResponseBody
>;
export type ClearFcmTokenApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.CLEAR_FCM_TOKEN,
  ClearFcmTokenApiCall,
  ClearFcmTokenApiResponse
>;

export type SetFcmTokenApiLocation = ApiLocationDefinition<
  ApiEndpointUri.SET_FCM_TOKEN,
  HttpVerb.POST,
  true
>;
export const setFcmTokenApiLocation: SetFcmTokenApiLocation = {
  uri: ApiEndpointUri.SET_FCM_TOKEN,
  method: HttpVerb.POST,
  authenticated: true
};
export type SetFcmTokenApiCall = ApiCallDefinition<
  SetFcmTokenApiLocation["uri"],
  SetFcmTokenApiLocation["method"],
  SetFcmTokenApiLocation["authenticated"],
  void,
  { fcmToken: string }
>;
export type SetFcmTokenApiResponse = ApiResponseDefinition<
  201,
  MessageApiResponseBody
>;
export type SetFcmTokenApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.SET_FCM_TOKEN,
  SetFcmTokenApiCall,
  SetFcmTokenApiResponse
>;
