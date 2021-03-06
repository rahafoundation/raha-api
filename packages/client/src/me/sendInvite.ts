import {
  SendInviteApiEndpoint,
  SendInviteApiCall,
  sendInviteApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";

/**
 * API call that sends an invite to join Raha to the provided email address.
 * @param inviteEmail Email address of invited new member
 * @param videoToken Token identifying invite video taken, if available
 */
export function sendInvite(
  apiBase: string,
  authToken: string,
  inviteEmail: string,
  videoToken: string,
  isJointVideo: boolean
) {
  const apiCall: SendInviteApiCall = {
    location: sendInviteApiLocation,
    request: {
      params: undefined,
      body: {
        inviteEmail,
        videoToken,
        isJointVideo
      }
    }
  };
  return callApi<SendInviteApiEndpoint>(apiBase, apiCall, authToken);
}
