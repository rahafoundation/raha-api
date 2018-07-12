import { Big } from "big.js";

import {
  MintApiEndpoint,
  MintApiCall,
  mintApiLocation
} from "../../server/routes/me/definitions";

import { callApi } from "../callApi";

export async function mint(apiBase: string, authToken: string, amount: Big) {
  const apiCall: MintApiCall = {
    location: mintApiLocation,
    request: {
      params: undefined,
      // TODO: should this be rounded to a precision?
      body: { amount: amount.toString() }
    }
  };
  return callApi<MintApiEndpoint>(apiBase, apiCall, authToken);
}
