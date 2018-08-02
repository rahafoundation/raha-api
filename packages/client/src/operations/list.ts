import {
  ListOperationsApiEndpoint,
  listOperationsApiLocation,
  ListOperationsApiCall
} from "@raha/api-shared/dist/routes/operations/definitions";

import { callApi } from "../callApi";

/**
 * API call to list all operations. Operations represent any action taken that
 * updates the state of the Raha community; it is a precursor for transactions
 * in the future Raha blockchain.
 */
export function list(apiBase: string) {
  const apiCall: ListOperationsApiCall = {
    location: listOperationsApiLocation,
    request: {
      params: undefined,
      body: undefined
    }
  };
  return callApi<ListOperationsApiEndpoint>(apiBase, apiCall, undefined);
}
