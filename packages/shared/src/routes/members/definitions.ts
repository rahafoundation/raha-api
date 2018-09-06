import { MemberId } from "../../models/identifiers";
import {
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointDefinition,
  ApiEndpointUri
} from "../ApiEndpoint";
import {
  OperationApiResponseBody,
  OperationsApiResponseBody
} from "../ApiEndpoint/ApiResponse";
import { HttpVerb } from "../../helpers/http";
import { ApiLocationDefinition } from "../ApiEndpoint/ApiCall";

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
    emailAddress: string;
    videoToken: string;
    username: string;
    inviteToken?: string;
  }
>;
export type CreateMemberApiResponse = ApiResponseDefinition<
  201,
  OperationsApiResponseBody
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
  { videoToken: string }
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
