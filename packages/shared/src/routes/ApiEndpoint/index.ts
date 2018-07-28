/**
 * Definitions of endpoints—how they are called and how they respond.
 */
import { ApiCall } from "./ApiCall";
import { ApiResponse } from "./ApiResponse";

import {
  GiveApiEndpoint,
  WebRequestInviteApiEndpoint,
  RequestInviteApiEndpoint,
  TrustMemberApiEndpoint,
  CreateMemberApiEndpoint,
  VerifyMemberApiEndpoint
} from "../../routes/members/definitions";
import {
  MintApiEndpoint,
  SendInviteApiEndpoint,
  ValidateMobileNumberApiEndpoint,
  SendAppInstallTextApiEndpoint
} from "../../routes/me/definitions";
import { ListOperationsApiEndpoint } from "../../routes/operations/definitions";
import { SSODiscourseApiEndpoint } from "../../routes/sso/definitions";

/**
 * Canonical name of an endpoint you can query.
 */
export enum ApiEndpointName {
  TRUST_MEMBER = "TRUST_MEMBER",
  GET_OPERATIONS = "GET_OPERATIONS",
  WEB_REQUEST_INVITE = "WEB_REQUEST_INVITE",
  REQUEST_INVITE = "REQUEST_INVITE",
  SEND_INVITE = "SEND_INVITE",
  MINT = "MINT",
  GIVE = "GIVE",
  VALIDATE_MOBILE_NUMBER = "VALIDATE_MOBILE_NUMBER",
  SEND_APP_INSTALL_TEXT = "SEND_APP_INSTALL_TEXT",
  SSO_DISCOURSE = "SSO_DISCOURSE",
  CREATE_MEMBER = "CREATE_MEMBER",
  VERIFY_MEMBER = "CREATE_MEMBER"
}

export enum ApiEndpointUri {
  TRUST_MEMBER = "members/:memberId/trust",
  GET_OPERATIONS = "operations",
  WEB_REQUEST_INVITE = "members/:memberId/web_request_invite",
  REQUEST_INVITE = "members/:memberId/request_invite",
  SEND_INVITE = "me/send_invite",
  MINT = "me/mint",
  GIVE = "members/:memberId/give",
  VALIDATE_MOBILE_NUMBER = "me/validateMobileNumber",
  SEND_APP_INSTALL_TEXT = "me/sendAppInstallText",
  SSO_DISCOURSE = "sso/discourse",
  CREATE_MEMBER = "members/createMember",
  VERIFY_MEMBER = "members/:memerId/verify"
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
  | WebRequestInviteApiEndpoint
  | RequestInviteApiEndpoint
  | SendInviteApiEndpoint
  | GiveApiEndpoint
  | MintApiEndpoint
  | ValidateMobileNumberApiEndpoint
  | SendAppInstallTextApiEndpoint
  | SSODiscourseApiEndpoint
  | CreateMemberApiEndpoint
  | VerifyMemberApiEndpoint;

export { ApiCallDefinition } from "./ApiCall";
export { ApiResponseDefinition } from "./ApiResponse";
