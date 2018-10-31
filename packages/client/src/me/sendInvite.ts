import {
  SendInviteApiEndpoint,
  SendInviteApiCall,
  sendInviteApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";
import { VideoReference } from "@raha/api-shared/dist/models/MediaReference";

/**
 * API call that sends an invite to join Raha to the provided email address.
 */
export function sendInvite({
  apiBase,
  authToken,
  inviteEmail,
  videoReference,
  isJointVideo
}: {
  apiBase: string;
  authToken: string;
  inviteEmail: string;
  videoReference: VideoReference;
  isJointVideo: boolean;
}) {
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
