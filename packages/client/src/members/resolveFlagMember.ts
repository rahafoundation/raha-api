import {
  MemberId,
  OperationId
} from "@raha/api-shared/dist/models/identifiers";

import { callApi } from "../callApi";
import {
  ResolveFlagMemberApiCall,
  resolveFlagMemberApiLocation,
  ResolveFlagMemberApiEndpoint
} from "@raha/api-shared/dist/routes/members/definitions";

/**
 * Resolve flag on a member.
 * @param apiBase
 * @param authToken
 * @param memberId
 * @param flagOperationId
 * @param reason
 */
export function resolveFlagMember(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  flagOperationId: OperationId,
  reason: string
) {
  const apiCall: ResolveFlagMemberApiCall = {
    location: resolveFlagMemberApiLocation,
    request: {
      params: { memberId },
      body: {
        reason,
        flag_operation_id: flagOperationId
      }
    }
  };
  return callApi<ResolveFlagMemberApiEndpoint>(apiBase, apiCall, authToken);
}
