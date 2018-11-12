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
  ListMembersApiEndpoint,
  FlagMemberApiEndpoint,
  ResolveFlagMemberApiEndpoint,
  TipApiEndpoint
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
import { CronNotifyOnUnmintedApiEndpoint } from "../cron/definitions";

/**
 * Canonical name of an endpoint you can query.
 */
export enum ApiEndpointName {
  // operations
  GET_OPERATIONS = "GET_OPERATIONS",
  // members
  GET_MEMBERS = "GET_MEMBERS",
  CREATE_MEMBER = "CREATE_MEMBER",
  TRUST_MEMBER = "TRUST_MEMBER",
  GIVE = "GIVE",
  TIP = "TIP",
  VERIFY_MEMBER = "VERIFY_MEMBER",
  FLAG_MEMBER = "FLAG_MEMBER",
  RESOLVE_FLAG_MEMBER = "RESOLVE_FLAG_MEMBER",
  // me
  EDIT_MEMBER = "EDIT_MEMBER",
  SEND_INVITE = "SEND_INVITE",
  MINT = "MINT",
  VALIDATE_MOBILE_NUMBER = "VALIDATE_MOBILE_NUMBER",
  SEND_APP_INSTALL_TEXT = "SEND_APP_INSTALL_TEXT",
  CLEAR_FCM_TOKEN = "CLEAR_FCM_TOKEN",
  SET_FCM_TOKEN = "SET_FCM_TOKEN",
  // sso
  SSO_DISCOURSE = "SSO_DISCOURSE",
  // cron
  CRON_NOTIFY_ON_UNMINTED = "SSO_NOTIFY_ON_UNMINTED"
}

export enum ApiEndpointUri {
  // operations
  GET_OPERATIONS = "operations",
  // members
  GET_MEMBERS = "members",
  CREATE_MEMBER = "members/createMember",
  TRUST_MEMBER = "members/:memberId/trust",
  GIVE = "members/:memberId/give",
  TIP = "members/:memberId/tip",
  VERIFY_MEMBER = "members/:memberId/verify",
  FLAG_MEMBER = "members/:memberId/flag",
  RESOLVE_FLAG_MEMBER = "members/:memberId/resolveFlag",
  // me
  EDIT_MEMBER = "me/edit",
  SEND_INVITE = "me/send_invite",
  MINT = "me/mint",
  VALIDATE_MOBILE_NUMBER = "me/validateMobileNumber",
  SEND_APP_INSTALL_TEXT = "me/sendAppInstallText",
  CLEAR_FCM_TOKEN = "me/clearFcmToken",
  SET_FCM_TOKEN = "me/setFcmToken",
  // sso
  SSO_DISCOURSE = "sso/discourse",
  // cron
  CRON_NOTIFY_ON_UNMINTED = "cron/notifyOnUnminted"
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
  // operations
  | ListOperationsApiEndpoint
  // members
  | ListMembersApiEndpoint
  | CreateMemberApiEndpoint
  | TrustMemberApiEndpoint
  | GiveApiEndpoint
  | TipApiEndpoint
  | VerifyMemberApiEndpoint
  | FlagMemberApiEndpoint
  | ResolveFlagMemberApiEndpoint
  // me
  | EditMemberApiEndpoint
  | SendInviteApiEndpoint
  | MintApiEndpoint
  | ValidateMobileNumberApiEndpoint
  | SendAppInstallTextApiEndpoint
  | ClearFcmTokenApiEndpoint
  | SetFcmTokenApiEndpoint
  // sso
  | SSODiscourseApiEndpoint
  // cron
  | CronNotifyOnUnmintedApiEndpoint;

export { ApiCallDefinition } from "./ApiCall";
export { ApiResponseDefinition } from "./ApiResponse";
