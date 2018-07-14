import {
  SendInviteApiEndpoint,
  SendInviteApiCall,
  sendInviteApiLocation
} from "../../shared/routes/me/definitions";

import { callApi } from "../callApi";

export function sendInvite(
  apiBase: string,
  authToken: string,
  inviteEmail: string,
  videoToken?: string
) {
  const apiCall: SendInviteApiCall = {
    location: sendInviteApiLocation,
    request: {
      params: undefined,
      body: { inviteEmail, videoToken }
    }
  };
  return callApi<SendInviteApiEndpoint>(apiBase, apiCall, authToken);
}
