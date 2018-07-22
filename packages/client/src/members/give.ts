import { Big } from "big.js";

import { MemberId } from "@raha/api-shared/models/identifiers";
import {
  GiveApiEndpoint,
  GiveApiCall,
  giveApiLocation
} from "@raha/api-shared/routes/members/definitions";

import { callApi } from "../callApi";

/**
 * API call to give Raha from the logged in member to another member.
 * @param memberId ID of member to give Raha to
 * @param amount Amount of Raha to give
 * @param memo Optional reason explaining why Raha was given
 */
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
