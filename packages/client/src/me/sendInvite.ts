import {
  SendInviteApiEndpoint,
  SendInviteApiCall,
  sendInviteApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";

/**
 * API call that sends an invite to join Raha to the provided email address.
 * @param inviteEmail Email address of invited new member
 * @param videoUrl Location of the video corresponding to this invite, if taken
 */
export function sendInvite(
  apiBase: string,
  authToken: string,
  inviteEmail: string,
  videoUrl: string,
  isJointVideo: boolean
) {
  const apiCall: SendInviteApiCall = {
    location: sendInviteApiLocation,
    request: {
      params: undefined,
      body: {
        inviteEmail,
        videoUrl,
        isJointVideo
      }
    }
  };
  return callApi<SendInviteApiEndpoint>(apiBase, apiCall, authToken);
}
