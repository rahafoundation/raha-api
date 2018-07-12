import {
  ListOperationsApiEndpoint,
  listOperationsApiLocation,
  ListOperationsApiCall
} from "../../server/routes/operations/definitions";

import { callApi } from "../callApi";

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
