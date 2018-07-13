/**
 * Definitions of endpoints—how they are called and how they respond.
 */
import { ApiCall } from "./ApiCall";
import { ApiResponse } from "./ApiResponse";

import {
  GiveApiEndpoint,
  RequestInviteApiEndpoint,
  TrustMemberApiEndpoint
} from "../../routes/members/definitions";
import {
  MintApiEndpoint,
  SendInviteApiEndpoint,
  MigrateApiEndpoint
} from "../../routes/me/definitions";
import { ListOperationsApiEndpoint } from "../../routes/operations/definitions";

/**
 * Canonical name of an endpoint you can query.
 */
export enum ApiEndpointName {
  TRUST_MEMBER = "TRUST_MEMBER",
  GET_OPERATIONS = "GET_OPERATIONS",
  REQUEST_INVITE = "REQUEST_INVITE",
  SEND_INVITE = "SEND_INVITE",
  MINT = "MINT",
  GIVE = "GIVE",
  MIGRATE = "MIGRATE"
}

export enum ApiEndpointUri {
  TRUST_MEMBER = "members/:memberId/trust",
  GET_OPERATIONS = "operations",
  REQUEST_INVITE = "members/:memberId/request_invite",
  SEND_INVITE = "me/send_invite",
  MINT = "me/mint",
  GIVE = "members/:memberId/give",
  MIGRATE = "me/migrate"
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
export type ApiEndpoint =
  | TrustMemberApiEndpoint
  | ListOperationsApiEndpoint
  | RequestInviteApiEndpoint
  | SendInviteApiEndpoint
  | GiveApiEndpoint
  | MintApiEndpoint
  | MigrateApiEndpoint;

export { ApiCallDefinition } from "./ApiCall";
export { ApiResponseDefinition } from "./ApiResponse";
