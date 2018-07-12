import {
  SendInviteApiEndpoint,
  SendInviteApiCall,
  sendInviteApiLocation
} from "../../server/routes/me/definitions";

import { callApi } from "../callApi";

export function sendInvite(
  apiBase: string,
  authToken: string,
  inviteEmail: string
) {
  const apiCall: SendInviteApiCall = {
    location: sendInviteApiLocation,
    request: {
      params: undefined,
      body: { inviteEmail }
    }
  };
  return callApi<SendInviteApiEndpoint>(apiBase, apiCall, authToken);
}
