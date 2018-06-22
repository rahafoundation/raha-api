import { MemberId, OperationId } from "../../models/identifiers";
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
  { inviteEmail: string }
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
