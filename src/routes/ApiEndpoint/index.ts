/**
 * Definitions of endpoints—how they are called and how they respond.
 */
import { Context } from "koa";

import { ApiCall } from "./ApiCall";
import { ApiResponse } from "./ApiResponse";

import {
  GiveApiEndpoint,
  RequestInviteApiEndpoint,
  TrustMemberApiEndpoint
} from "../members";
import { MintApiEndpoint, SendInviteApiEndpoint } from "../me";
import { ListOperationsApiEndpoint } from "../operations";
import { RahaApiContext } from "../../app";

/**
 * Canonical name of an endpoint you can query.
 */
export const enum ApiEndpointName {
  TRUST_MEMBER = "TRUST_MEMBER",
  GET_OPERATIONS = "GET_OPERATIONS",
  REQUEST_INVITE = "REQUEST_INVITE",
  SEND_INVITE = "SEND_INVITE",
  MINT = "MINT",
  GIVE = "GIVE"
}

/**
 * Full definition of how to use an API endpoint:
 * - how it is called
 * - and what it will return to you.
 */
export interface ApiEndpointDefinition<
  Endpoint extends ApiEndpointName,
  Call extends ApiCall,
  Resp extends ApiResponse
> {
  endpoint: Endpoint;
  call: Call;
  response: Resp;
}

export type ApiDefinition =
  | TrustMemberApiEndpoint
  | ListOperationsApiEndpoint
  | RequestInviteApiEndpoint
  | SendInviteApiEndpoint
  | GiveApiEndpoint
  | MintApiEndpoint;

/**
 * Extracts data necessary to process an API call from the context,
 * computes the response and then returns it.
 * @param endpoint Endpoint being hit
 * @param apiHandler Handler for that endpoint
 */
export function createApiRoute<Def extends ApiDefinition>(
  endpoint: Def["endpoint"],
  apiHandler: (call: Def["call"]) => Def["response"]
): (ctx: Context) => Promise<void> {
  return async ctx => {
    const { status, body } = await apiHandler({
      params: ctx.params,
      body: ctx.body
    });
    ctx.status = status;
    ctx.body = body;
    return;
  };
}

export { ApiCallDefinition } from "./ApiCall";
export { ApiResponseDefinition } from "./ApiResponse";
