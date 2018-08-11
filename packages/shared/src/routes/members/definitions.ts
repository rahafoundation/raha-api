import { MemberId } from "../../models/identifiers";
import {
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointDefinition,
  ApiEndpointUri
} from "../ApiEndpoint";
import { OperationApiResponseBody } from "../ApiEndpoint/ApiResponse";
import { HttpVerb } from "../../helpers/http";
import { ApiLocationDefinition } from "../ApiEndpoint/ApiCall";

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
  { fullName: string; username: string; videoToken?: string }
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

export type CreateMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.CREATE_MEMBER,
  HttpVerb.POST,
  true
>;
export const createMemberApiLocation: CreateMemberApiLocation = {
  uri: ApiEndpointUri.CREATE_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type CreateMemberApiCall = ApiCallDefinition<
  CreateMemberApiLocation["uri"],
  CreateMemberApiLocation["method"],
  CreateMemberApiLocation["authenticated"],
  void,
  {
    fullName: string;
    videoToken?: string;
    isJointVideo: boolean;
    username: string;
    requestInviteFromMemberId?: string;
  }
>;
export type CreateMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;

export type CreateMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.CREATE_MEMBER,
  CreateMemberApiCall,
  CreateMemberApiResponse
>;

export type VerifyMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.VERIFY_MEMBER,
  HttpVerb.POST,
  true
>;
export const verifyMemberApiLocation: VerifyMemberApiLocation = {
  uri: ApiEndpointUri.VERIFY_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type VerifyMemberApiCall = ApiCallDefinition<
  VerifyMemberApiLocation["uri"],
  VerifyMemberApiLocation["method"],
  VerifyMemberApiLocation["authenticated"],
  { memberId: string },
  {
    videoToken: string;
  }
>;
export type VerifyMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;

export type VerifyMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.CREATE_MEMBER,
  VerifyMemberApiCall,
  VerifyMemberApiResponse
>;
