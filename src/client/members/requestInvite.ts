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
 * @param videoToken Optional video token of the invite, of the new member being invited by the
 * existing member. If not provided, the video will be pulled from private-video.
 * @param username New username for the new member. Must be unique
 */
export function requestInvite(
  apiBase: string,
  authToken: string,
  memberId: MemberId,
  fullName: string,
  username: string,
  videoToken?: string
) {
  const apiCall: RequestInviteApiCall = {
    location: requestInviteApiLocation,
    request: {
      params: { memberId },
      body: { fullName, username, videoToken }
    }
  };
  return callApi<RequestInviteApiEndpoint>(apiBase, apiCall, authToken);
}
