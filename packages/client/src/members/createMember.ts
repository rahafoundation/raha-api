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
 * being invited by the existing member. If not provided, the video will be pulled from private-video.
 * @param isJointVideo boolean indicating whether both the creating and inviting members are present in the video
 * @param requestInviteFromMemberId Optional id of the member this user is requesting an invite from.
 */
export function createMember(
  apiBase: string,
  authToken: string,
  fullName: string,
  username: string,
  videoToken: string,
  isJointVideo: boolean,
  requestInviteFromMemberId?: string
) {
  const apiCall: CreateMemberApiCall = {
    location: createMemberApiLocation,
    request: {
      params: undefined,
      body: {
        fullName,
        username,
        videoToken,
        isJointVideo,
        requestInviteFromMemberId
      }
    }
  };
  return callApi<CreateMemberApiEndpoint>(apiBase, apiCall, authToken);
}
