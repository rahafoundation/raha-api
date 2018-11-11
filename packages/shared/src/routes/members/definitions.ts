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
  OperationsApiResponseBody,
  MembersApiResponseBody
} from "../ApiEndpoint/ApiResponse";
import { HttpVerb } from "../../helpers/http";
import { ApiLocationDefinition } from "../ApiEndpoint/ApiCall";
import {
  FlagMemberPayload,
  ResolveFlagMemberPayload
} from "../../models/Operation";
import { Omit } from "../../helpers/Omit";

export type ListMembersApiLocation = ApiLocationDefinition<
  ApiEndpointUri.GET_MEMBERS,
  HttpVerb.GET,
  false
>;
export const listMembersApiLocation: ListMembersApiLocation = {
  uri: ApiEndpointUri.GET_MEMBERS,
  method: HttpVerb.GET,
  authenticated: false
};
export type ListMembersApiCall = ApiCallDefinition<
  ListMembersApiLocation["uri"],
  ListMembersApiLocation["method"],
  ListMembersApiLocation["authenticated"],
  void,
  void
>;
export type ListMembersApiResponse = ApiResponseDefinition<
  200,
  MembersApiResponseBody
>;
export type ListMembersApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.GET_MEMBERS,
  ListMembersApiCall,
  ListMembersApiResponse
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

export type TipApiLocation = ApiLocationDefinition<
  ApiEndpointUri.TIP,
  HttpVerb.POST,
  true
>;
export const tipApiLocation: TipApiLocation = {
  uri: ApiEndpointUri.TIP,
  method: HttpVerb.POST,
  authenticated: true
};
export type TipApiCall = ApiCallDefinition<
  TipApiLocation["uri"],
  TipApiLocation["method"],
  TipApiLocation["authenticated"],
  { memberId: MemberId },
  { amount: string; targetOperation: string }
>;
export type TipApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type TipApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.TIP,
  TipApiCall,
  TipApiResponse
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
    subscribeToNewsletter?: boolean;
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
  { memberId: MemberId },
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

export type FlagMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.FLAG_MEMBER,
  HttpVerb.POST,
  true
>;
export const flagMemberApiLocation: FlagMemberApiLocation = {
  uri: ApiEndpointUri.FLAG_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type FlagMemberApiCall = ApiCallDefinition<
  FlagMemberApiLocation["uri"],
  FlagMemberApiLocation["method"],
  FlagMemberApiLocation["authenticated"],
  { memberId: MemberId },
  Omit<FlagMemberPayload, "to_uid">
>;
export type FlagMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type FlagMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.FLAG_MEMBER,
  FlagMemberApiCall,
  FlagMemberApiResponse
>;

export type ResolveFlagMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.RESOLVE_FLAG_MEMBER,
  HttpVerb.POST,
  true
>;
export const resolveFlagMemberApiLocation: ResolveFlagMemberApiLocation = {
  uri: ApiEndpointUri.RESOLVE_FLAG_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type ResolveFlagMemberApiCall = ApiCallDefinition<
  ResolveFlagMemberApiLocation["uri"],
  ResolveFlagMemberApiLocation["method"],
  ResolveFlagMemberApiLocation["authenticated"],
  { memberId: MemberId },
  Omit<ResolveFlagMemberPayload, "to_uid">
>;
export type ResolveFlagMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type ResolveFlagMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.RESOLVE_FLAG_MEMBER,
  ResolveFlagMemberApiCall,
  ResolveFlagMemberApiResponse
>;
