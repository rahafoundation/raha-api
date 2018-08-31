import {
  CreateMemberApiEndpoint,
  CreateMemberApiCall,
  createMemberApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";

import { callApi } from "../callApi";

/**
 * API call for a non-member to join Raha and create a new member.
 * @param fullName Full name of new member
 * @param username New username for the new member. Must be unique
 * @param videoToken Video token of the invite, of the new member either identifying themselves or
 * being invited by the existing member.
 * @param inviteToken: Token identifying associated invite operation.
 */
export function createMember(
  apiBase: string,
  authToken: string,
  fullName: string,
  emailAddress: string,
  username: string,
  videoToken: string,
  inviteToken?: string
) {
  const apiCall: CreateMemberApiCall = {
    location: createMemberApiLocation,
    request: {
      params: undefined,
      body: {
        fullName,
        username,
        emailAddress,
        videoToken,
        inviteToken
      }
    }
  };
  return callApi<CreateMemberApiEndpoint>(apiBase, apiCall, authToken);
}
