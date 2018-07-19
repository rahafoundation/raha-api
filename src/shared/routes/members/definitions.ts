import {
  Operation,
  OperationToBeCreated,
  OperationType
} from "../../models/Operation";
import { MemberId } from "../../models/identifiers";
import {
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointDefinition,
  ApiEndpointUri
} from "../../types/ApiEndpoint";
import { OperationApiResponseBody } from "../../types/ApiEndpoint/ApiResponse";
import { HttpVerb } from "../../types/helpers/http";
import { ApiLocationDefinition } from "../../types/ApiEndpoint/ApiCall";

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type WebRequestInviteApiLocation = ApiLocationDefinition<
  ApiEndpointUri.WEB_REQUEST_INVITE,
  HttpVerb.POST,
  true
>;
export const webRequestInviteApiLocation: WebRequestInviteApiLocation = {
  uri: ApiEndpointUri.WEB_REQUEST_INVITE,
  method: HttpVerb.POST,
  authenticated: true
};
export type WebRequestInviteApiCall = ApiCallDefinition<
  WebRequestInviteApiLocation["uri"],
  WebRequestInviteApiLocation["method"],
  WebRequestInviteApiLocation["authenticated"],
  { memberId: MemberId },
  { fullName: string; videoUrl: string; username: string }
>;
export type WebRequestInviteApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;

export type WebRequestInviteApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.WEB_REQUEST_INVITE,
  WebRequestInviteApiCall,
  WebRequestInviteApiResponse
>;

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type RequestInviteApiLocation = ApiLocationDefinition<
  ApiEndpointUri.REQUEST_INVITE,
  HttpVerb.POST,
  true
>;
export const requestInviteApiLocation: RequestInviteApiLocation = {
  uri: ApiEndpointUri.REQUEST_INVITE,
  method: HttpVerb.POST,
  authenticated: true
};
export type RequestInviteApiCall = ApiCallDefinition<
  RequestInviteApiLocation["uri"],
  RequestInviteApiLocation["method"],
  RequestInviteApiLocation["authenticated"],
  { memberId: MemberId },
  { fullName: string; videoUrl: string; username: string }
>;
export type RequestInviteApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;

export type RequestInviteApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.REQUEST_INVITE,
  RequestInviteApiCall,
  RequestInviteApiResponse
>;

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type TrustMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.TRUST_MEMBER,
  HttpVerb.POST,
  true
>;
export const trustMemberApiLocation: TrustMemberApiLocation = {
  uri: ApiEndpointUri.TRUST_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type TrustMemberApiCall = ApiCallDefinition<
  TrustMemberApiLocation["uri"],
  TrustMemberApiLocation["method"],
  TrustMemberApiLocation["authenticated"],
  { memberId: MemberId },
  void
>;
export type TrustMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type TrustMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.TRUST_MEMBER,
  TrustMemberApiCall,
  TrustMemberApiResponse
>;

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type GiveApiLocation = ApiLocationDefinition<
  ApiEndpointUri.GIVE,
  HttpVerb.POST,
  true
>;
export const giveApiLocation: GiveApiLocation = {
  uri: ApiEndpointUri.GIVE,
  method: HttpVerb.POST,
  authenticated: true
};
export type GiveApiCall = ApiCallDefinition<
  GiveApiLocation["uri"],
  GiveApiLocation["method"],
  GiveApiLocation["authenticated"],
  { memberId: MemberId },
  { amount: string; memo?: string }
>;
export type GiveApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type GiveApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.GIVE,
  GiveApiCall,
  GiveApiResponse
>;
