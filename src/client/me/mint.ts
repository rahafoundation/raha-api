import { Big } from "big.js";

import {
  MintApiEndpoint,
  MintApiCall,
  mintApiLocation
} from "../../server/routes/me/definitions";

import { callApi } from "../callApi";
import {
  MintPayload,
  MintBasicIncomePayload,
  MintReferralBonusPayload
} from "../../server/models/Operation";
import { Omit } from "../../shared/typeHelpers/Omit";

type MintBasicIncomeParams = Omit<MintBasicIncomePayload, "amount"> & {
  amount: Big;
};
type MintReferralBonusParams = Omit<MintReferralBonusPayload, "amount"> & {
  amount: Big;
};

type MintArgs = MintBasicIncomeParams | MintReferralBonusParams;

export async function mint(
  apiBase: string,
  authToken: string,
  params: MintArgs
) {
  const body: MintPayload = {
    ...params,
    amount: params.amount.toFixed(2)
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
