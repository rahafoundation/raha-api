import {
  SendInviteApiEndpoint,
  SendInviteApiCall,
  sendInviteApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";
import { VideoReference } from "@raha/api-shared/dist/models/MediaReference";

/**
 * API call that sends an invite to join Raha to the provided email address.
 * @param inviteEmail Email address of invited new member
 * @param videoReference Token identifying invite video taken, if available
 */
export function sendInvite(
  apiBase: string,
  authToken: string,
  inviteEmail: string,
  videoReference: VideoReference,
  isJointVideo: boolean
) {
  const apiCall: SendInviteApiCall = {
    location: sendInviteApiLocation,
    request: {
      params: undefined,
      body: {
        inviteEmail,
        videoReference,
        isJointVideo
      }
    }
  };
  return callApi<SendInviteApiEndpoint>(apiBase, apiCall, authToken);
}
