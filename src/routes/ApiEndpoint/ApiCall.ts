import {
  TrustMemberApiCall,
  RequestInviteApiCall,
  GiveApiCall
} from "../members";
import { ListOperationsApiCall } from "../operations";
import { SendInviteApiCall, MintApiCall } from "../me";

/**
 * Definition for the arguments you need to call a particular API endpoint. Also
 * includes whether or not the user must be authenticated when it's called.
 */
export interface ApiCallDefinition<
  Params,
  Body,
  Authenticated extends boolean
> {
  params: Params;
  body: Body;
  authenticated: Authenticated;
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
