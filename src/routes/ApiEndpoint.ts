/**
 * Definitions of endpoints—how they are called and how they respond.
 */
import ApiResponse, {
  OperationsApiResponse,
  OperationApiResponse,
  MessageApiResponse
} from "./ApiResponse";

import {
  GiveApiCall,
  RequestInviteApiCall,
  TrustMemberApiCall,
  GiveApiEndpoint,
  RequestInviteApiEndpoint,
  TrustMemberApiEndpoint
} from "./members";
import {
  MintApiCall,
  SendInviteApiCall,
  MintApiEndpoint,
  SendInviteApiEndpoint
} from "./me";
import { ListOperationsApiCall, ListOperationsApiEndpoint } from "./operations";

/**
 * Canonical name of an endpoint you can query.
 */
export const enum ApiEndpoint {
  TRUST_MEMBER = "TRUST_MEMBER",
  GET_OPERATIONS = "GET_OPERATIONS",
  REQUEST_INVITE = "REQUEST_INVITE",
  SEND_INVITE = "SEND_INVITE",
  MINT = "MINT",
  GIVE = "GIVE"
}

/**
 * Definition for the arguments you need to call a particular API endpoint
 */
export interface ApiCallDefinition<E extends ApiEndpoint, Params, Body> {
  endpoint: E;
  params: Params;
  body: Body;
}

/**
 * All API calls you can make, and the arguments you need to call them.
 */
export type ApiCall =
  | TrustMemberApiCall
  | ListOperationsApiCall
  | RequestInviteApiCall
  | SendInviteApiCall
  | MintApiCall
  | GiveApiCall;

/**
 * Full definition of how to use an API endpoint:
 * - how it is called
 * - and what it will return to you.
 */
export interface ApiEndpointDefinition<
  Call extends ApiCall,
  Resp extends ApiResponse
> {
  call: Call;
  response: Resp;
}

type ApiDefinition =
  | TrustMemberApiEndpoint
  | ListOperationsApiEndpoint
  | RequestInviteApiEndpoint
  | SendInviteApiEndpoint
  | GiveApiEndpoint
  | MintApiEndpoint;
