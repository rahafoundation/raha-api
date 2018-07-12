import { MemberId } from "../../models/identifiers";
import {
  RequestInviteApiEndpoint,
  RequestInviteApiCall,
  requestInviteApiLocation
} from "../../routes/members/definitions";

import { callApi } from "../callApi";

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
