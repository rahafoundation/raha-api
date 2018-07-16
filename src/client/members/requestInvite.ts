import { MemberId } from "../../shared/models/identifiers";
import {
  RequestInviteApiEndpoint,
  RequestInviteApiCall,
  requestInviteApiLocation
} from "../../shared/routes/members/definitions";

import { callApi } from "../callApi";

/**
 * API call for a non-member to request an invite from an existing one.
 * @param memberId Member to request invite from
 * @param fullName Full name of new member
 * @param videoUrl URL of invite video, of the new member being invited by the
 * existing member
 * @param username New username for the new member. Must be unique
 */
export function requestInvite(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  fullName: string,
  videoUrl: string,
  username: string
) {
  const apiCall: RequestInviteApiCall = {
    location: requestInviteApiLocation,
    request: {
      params: { memberId },
      body: { fullName, videoUrl, username }
    }
  };
  return callApi<RequestInviteApiEndpoint>(apiBase, apiCall, authToken);
}
