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
 * @param videoUrl Video of the new member either identifying themselves. If a
 * joint video from a previous invitation, should match the videoUrl field of
 * an existing invite operation.
 * @param inviteToken: Token identifying associated invite operation.
 */
export function createMember(
  apiBase: string,
  authToken: string,
  fullName: string,
  emailAddress: string,
  username: string,
  videoUrl: string,
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
        videoUrl,
        inviteToken
      }
    }
  };
  return callApi<CreateMemberApiEndpoint>(apiBase, apiCall, authToken);
}
