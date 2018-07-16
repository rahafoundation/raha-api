import { MemberId } from "../../shared/models/identifiers";
import {
  TrustMemberApiEndpoint,
  TrustMemberApiCall,
  trustMemberApiLocation
} from "../../shared/routes/members/definitions";

import { callApi } from "../callApi";

/**
 * API call to create a new trust connection from the logged in member to the given member
 * @param memberId ID of member to trust
 */
export function trust(apiBase: string, authToken: string, memberId: MemberId) {
  const apiCall: TrustMemberApiCall = {
    location: trustMemberApiLocation,
    request: {
      params: { memberId },
      body: undefined
    }
  };
  return callApi<TrustMemberApiEndpoint>(apiBase, apiCall, authToken);
}
