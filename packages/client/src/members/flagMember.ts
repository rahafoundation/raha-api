import {
  FlagMemberApiCall,
  flagMemberApiLocation,
  FlagMemberApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";
import { MemberId } from "@raha/api-shared/dist/models/identifiers";

import { callApi } from "../callApi";

/**
 * Flag a member.
 * @param apiBase
 * @param authToken
 * @param memberId
 * @param reason
 */
export function flagMember(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  reason: string
) {
  const apiCall: FlagMemberApiCall = {
    location: flagMemberApiLocation,
    request: {
      params: { memberId },
      body: {
        reason
      }
    }
  };
  return callApi<FlagMemberApiEndpoint>(apiBase, apiCall, authToken);
}
