/**
 * Definitions of endpoints—how they are called and how they respond.
 */
import ApiCall from "./ApiCall";
import ApiResponse from "./ApiResponse";

import {
  GiveApiEndpoint,
  RequestInviteApiEndpoint,
  TrustMemberApiEndpoint
} from "../members";
import { MintApiEndpoint, SendInviteApiEndpoint } from "../me";
import { ListOperationsApiEndpoint } from "../operations";
import { RahaApiContext, AuthenticatedContext } from "../../app";

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

export const enum ApiEndpointUri {
  TRUST_MEMBER = "members/:memberId/trust",
  GET_OPERATIONS = "operations",
  REQUEST_INVITE = "members/:memberId/request_invite",
  SEND_INVITE = "me/send_invite",
  MINT = "me/mint",
  GIVE = "members/:memberId/give"
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

/**
 * The set of API endpoints defined in the application.
 *
 * If you add a new API endpoint, be sure to add it to this list, and to make
 * the server respond to it, add it to apiRoutes in app.ts as well.
 */
type ApiEndpoint =
  | TrustMemberApiEndpoint
  | ListOperationsApiEndpoint
  | RequestInviteApiEndpoint
  | SendInviteApiEndpoint
  | GiveApiEndpoint
  | MintApiEndpoint;
export default ApiEndpoint;

export type ApiHandler<Def extends ApiEndpoint> = (
  request: {
    params: Def["call"]["request"]["params"];
    body: Def["call"]["request"]["body"];
  },
  loggedInMemberToken: Def["call"]["location"]["authenticated"] extends true
    ? AuthenticatedContext["state"]["loggedInMemberToken"]
    : undefined
) => Promise<Def["response"]>;

/**
 * Extracts data necessary to process an API call from the context,
 * computes the response and then returns it.
 * @param endpoint Endpoint being hit
 * @param apiHandler Handler for that endpoint
 */
export function createApiRoute<Def extends ApiEndpoint>(
  apiHandler: ApiHandler<Def>
): (
  ctx: RahaApiContext<Def["call"]["location"]["authenticated"]>
) => Promise<void> {
  return async ctx => {
    const { status, body } = await apiHandler(
      {
        params: ctx.params,
        body: ctx.request.body
      },
      ctx.state.loggedInMemberToken
    );
    ctx.status = status;
    ctx.body = JSON.stringify(body);
    return;
  };
}

export { ApiCallDefinition } from "./ApiCall";
export { ApiResponseDefinition } from "./ApiResponse";
