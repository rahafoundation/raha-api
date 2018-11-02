import {
  CreateMemberApiEndpoint,
  CreateMemberApiCall,
  createMemberApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";

import { callApi } from "../callApi";
import { VideoReference } from "@raha/api-shared/dist/models/MediaReference";

/**
 * API call for a non-member to join Raha and create a new member.
 * @param fullName Full name of new member
 * @param username New username for the new member. Must be unique
 * @param videoToken Video token of the invite, of the new member either identifying themselves or
 * being invited by the existing member.
 * @param inviteToken: Token identifying associated invite operation.
 * @param subscribeToNewsletter Whether user wants to be subscribed to the
 * update newsletter
 */
export function createMember(
  apiBase: string,
  authToken: string,
  fullName: string,
  emailAddress: string,
  username: string,
  videoReference: VideoReference,
  inviteToken?: string,
  subscribeToNewsletter?: boolean
) {
  const apiCall: CreateMemberApiCall = {
    location: createMemberApiLocation,
    request: {
      params: undefined,
      body: {
        fullName,
        username,
        emailAddress,
        videoReference,
        inviteToken,
        subscribeToNewsletter
      }
    }
  };
  return callApi<CreateMemberApiEndpoint>(apiBase, apiCall, authToken);
}
