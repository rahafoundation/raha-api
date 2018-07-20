import { Big } from "big.js";

import {
  MintApiEndpoint,
  MintApiCall,
  mintApiLocation
} from "../../shared/routes/me/definitions";

import { callApi } from "../callApi";
import {
  MintPayload,
  MintBasicIncomePayload,
  MintReferralBonusPayload
} from "../../shared/models/Operation";
import { Omit } from "../../shared/types/helpers/Omit";

type MintBasicIncomeParams = Omit<MintBasicIncomePayload, "amount"> & {
  amount: Big;
};
type MintReferralBonusParams = Omit<MintReferralBonusPayload, "amount"> & {
  amount: Big;
};

type MintArgs = MintBasicIncomeParams | MintReferralBonusParams;

/**
 * API call that issues a request to mint Raha.
 * @param params Identify what the source of the funds are (basic
 * income/referral bonus) and the amount
 */
export async function mint(
  apiBase: string,
  authToken: string,
  params: MintArgs
) {
  const body: MintPayload = {
    ...params,
    amount: params.amount.round(2, 0).toString()
  };

  const apiCall: MintApiCall = {
    location: mintApiLocation,
    request: {
      params: undefined,
      body
    }
  };
  return callApi<MintApiEndpoint>(apiBase, apiCall, authToken);
}
