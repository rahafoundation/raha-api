import { Big } from "big.js";

import { MemberId } from "../../models/identifiers";
import {
  GiveApiEndpoint,
  GiveApiCall,
  giveApiLocation
} from "../../routes/members/definitions";

import { callApi } from "../callApi";

export function give(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  amount: Big,
  memo?: string
) {
  const apiCall: GiveApiCall = {
    location: giveApiLocation,
    request: {
      params: { memberId },
      // TODO: should this be round down to some precision?
      body: { amount: amount.toString(), memo }
    }
  };
  return callApi<GiveApiEndpoint>(apiBase, apiCall, authToken);
}
