import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import {
  VerifyMemberApiEndpoint,
  VerifyMemberApiCall,
  verifyMemberApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";

import { callApi } from "../callApi";

/**
 * API call to create a new verify connection from the logged in member to the given member
 * @param memberId ID of member to verify
 * @param videoToken Token of verification video
 */
export function verify(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  videoToken?: string,
  videoUrl?: string
) {
  const apiCall: VerifyMemberApiCall = {
    location: verifyMemberApiLocation,
    request: {
      params: { memberId },
      body: {
        videoToken,
        videoUrl
      }
    }
  };
  return callApi<VerifyMemberApiEndpoint>(apiBase, apiCall, authToken);
}
