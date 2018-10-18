import { Big } from "big.js";

import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import {
  GiveApiEndpoint,
  GiveApiCall,
  giveApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";
import { GiveContent } from "@raha/api-shared/dist/models/Operation";

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
  content?: GiveContent
) {
  const apiCall: GiveApiCall = {
    location: giveApiLocation,
    request: {
      params: { memberId },
      // TODO: should this be round down to some precision?
      body: { amount: amount.toString(), content }
    }
  };
  return callApi<GiveApiEndpoint>(apiBase, apiCall, authToken);
}
