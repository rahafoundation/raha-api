import { Big } from "big.js";

import {
  MemberId,
  OperationId
} from "@raha/api-shared/dist/models/identifiers";
import {
  GiveApiEndpoint,
  GiveApiCall,
  giveApiLocation,
  TipApiCall,
  tipApiLocation,
  TipApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";

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

/**
 * API call to tip Raha from the logged in member to another member.
 * @param memberId ID of member to tip Raha to
 * @param amount Amount of Raha to give
 * @param targetOperation Target Operation ID being tipped
 */
export function tip(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  amount: Big,
  targetOperationId: OperationId
) {
  const apiCall: TipApiCall = {
    location: tipApiLocation,
    request: {
      params: { memberId },
      // TODO: should this be round down to some precision?
      body: { amount: amount.toString(), targetOperationId }
    }
  };
  return callApi<TipApiEndpoint>(apiBase, apiCall, authToken);
}
