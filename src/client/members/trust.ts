import { MemberId } from "../../models/identifiers";
import {
  TrustMemberApiEndpoint,
  TrustMemberApiCall,
  trustMemberApiLocation
} from "../../routes/members/definitions";

import { callApi } from "../callApi";

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
