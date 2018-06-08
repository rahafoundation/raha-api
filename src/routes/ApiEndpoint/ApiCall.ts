import {
  TrustMemberApiCall,
  RequestInviteApiCall,
  GiveApiCall
} from "../members";
import { ListOperationsApiCall } from "../operations";
import { SendInviteApiCall, MintApiCall } from "../me";

/**
 * Definition for the arguments you need to call a particular API endpoint
 */
export interface ApiCallDefinition<Params, Body> {
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
