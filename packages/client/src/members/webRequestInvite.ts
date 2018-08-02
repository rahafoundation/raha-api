import { MemberId } from "@raha/api-shared/dist/models/identifiers";
import {
  WebRequestInviteApiEndpoint,
  WebRequestInviteApiCall,
  webRequestInviteApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";

import { callApi } from "../callApi";

/**
 * API call for a non-member to request an invite from an existing one.
 * @param memberId Member to request invite from
 * @param fullName Full name of new member
 * @param videoUrl URL of invite video, of the new member being invited by the
 * existing member
 * @param username New username for the new member. Must be unique
 */
export function webRequestInvite(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  fullName: string,
  videoUrl: string,
  username: string
) {
  const apiCall: WebRequestInviteApiCall = {
    location: webRequestInviteApiLocation,
    request: {
      params: { memberId },
      body: { fullName, videoUrl, username }
    }
  };
  return callApi<WebRequestInviteApiEndpoint>(apiBase, apiCall, authToken);
}
