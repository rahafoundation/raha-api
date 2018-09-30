/**
 * Definitions of endpoints—how they are called and how they respond.
 */
import { ApiCall } from "./ApiCall";
import { ApiResponse } from "./ApiResponse";

import {
  GiveApiEndpoint,
  TrustMemberApiEndpoint,
  CreateMemberApiEndpoint,
  VerifyMemberApiEndpoint,
  ListMembersApiEndpoint
} from "../../routes/members/definitions";
import {
  MintApiEndpoint,
  SendInviteApiEndpoint,
  ValidateMobileNumberApiEndpoint,
  SendAppInstallTextApiEndpoint,
  SetFcmTokenApiEndpoint,
  ClearFcmTokenApiEndpoint,
  EditMemberApiEndpoint
} from "../../routes/me/definitions";
import { ListOperationsApiEndpoint } from "../../routes/operations/definitions";
import { SSODiscourseApiEndpoint } from "../../routes/sso/definitions";

/**
 * Canonical name of an endpoint you can query.
 */
export enum ApiEndpointName {
  GET_OPERATIONS = "GET_OPERATIONS",
  GET_MEMBERS = "GET_MEMBERS",
  EDIT_MEMBER = "EDIT_MEMBER",
  TRUST_MEMBER = "TRUST_MEMBER",
  SEND_INVITE = "SEND_INVITE",
  MINT = "MINT",
  GIVE = "GIVE",
  VALIDATE_MOBILE_NUMBER = "VALIDATE_MOBILE_NUMBER",
  SEND_APP_INSTALL_TEXT = "SEND_APP_INSTALL_TEXT",
  SSO_DISCOURSE = "SSO_DISCOURSE",
  CREATE_MEMBER = "CREATE_MEMBER",
  VERIFY_MEMBER = "CREATE_MEMBER",
  CLEAR_FCM_TOKEN = "CLEAR_FCM_TOKEN",
  SET_FCM_TOKEN = "SET_FCM_TOKEN"
}

export enum ApiEndpointUri {
  GET_OPERATIONS = "operations",
  GET_MEMBERS = "members",
  TRUST_MEMBER = "members/:memberId/trust",
  EDIT_MEMBER = "me/edit",
  SEND_INVITE = "me/send_invite",
  MINT = "me/mint",
  GIVE = "members/:memberId/give",
  VALIDATE_MOBILE_NUMBER = "me/validateMobileNumber",
  SEND_APP_INSTALL_TEXT = "me/sendAppInstallText",
  SSO_DISCOURSE = "sso/discourse",
  CREATE_MEMBER = "members/createMember",
  VERIFY_MEMBER = "members/:memberId/verify",
  CLEAR_FCM_TOKEN = "me/clearFcmToken",
  SET_FCM_TOKEN = "me/setFcmToken"
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
  | ListOperationsApiEndpoint
  | ListMembersApiEndpoint
  | TrustMemberApiEndpoint
  | SendInviteApiEndpoint
  | GiveApiEndpoint
  | MintApiEndpoint
  | ValidateMobileNumberApiEndpoint
  | SendAppInstallTextApiEndpoint
  | SSODiscourseApiEndpoint
  | CreateMemberApiEndpoint
  | EditMemberApiEndpoint
  | VerifyMemberApiEndpoint
  | ClearFcmTokenApiEndpoint
  | SetFcmTokenApiEndpoint;

export { ApiCallDefinition } from "./ApiCall";
export { ApiResponseDefinition } from "./ApiResponse";
