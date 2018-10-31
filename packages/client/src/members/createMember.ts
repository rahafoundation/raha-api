import {
  CreateMemberApiEndpoint,
  CreateMemberApiCall,
  createMemberApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";
import { VideoReference } from "@raha/api-shared/dist/models/MediaReference";

import { callApi } from "../callApi";

/**
 * API call for a non-member to join Raha and create a new member.
 * @param fullName Full name of new member
 * @param username New username for the new member. Must be unique
 * @param videoReference Video of the new member either identifying themselves.
 * If a joint video from a previous invitation, should match the videoReference
 * field of an existing invite operation.
 * @param inviteToken: Token identifying associated invite operation.
 * @param subscribeToNewsletter Whether user wants to be subscribed to the
 * update newsletter
 */
export function createMember({
  apiBase,
  authToken,
  fullName,
  emailAddress,
  username,
  videoReference,
  inviteToken,
  subscribeToNewsletter
}: {
  apiBase: string;
  authToken: string;
  fullName: string;
  emailAddress: string;
  username: string;
  videoReference: VideoReference;
  inviteToken?: string;
  subscribeToNewsletter?: boolean;
}) {
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
