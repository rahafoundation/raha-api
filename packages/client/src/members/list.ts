import {
  ListMembersApiCall,
  listMembersApiLocation,
  ListMembersApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";
import { callApi } from "../callApi";

/**
 * Api call to list public information for all members.
 */
export function list(apiBase: string) {
  const apiCall: ListMembersApiCall = {
    location: listMembersApiLocation,
    request: {
      params: undefined,
      body: undefined
    }
  };
  return callApi<ListMembersApiEndpoint>(apiBase, apiCall, undefined);
}
