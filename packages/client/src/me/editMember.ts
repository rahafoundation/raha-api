import { callApi } from "../callApi";
import { EditMemberPayload } from "@raha/api-shared/dist/models/Operation";
import {
  EditMemberApiCall,
  editMemberApiLocation,
  EditMemberApiEndpoint
} from "@raha/api-shared/dist/routes/me/definitions";

/**
 * API call that edits the member object of the currently-signed-in member.
 */
export function editMember(
  apiBase: string,
  authToken: string,
  memberEditData: EditMemberPayload
) {
  const apiCall: EditMemberApiCall = {
    location: editMemberApiLocation,
    request: {
      params: undefined,
      body: memberEditData
    }
  };
  return callApi<EditMemberApiEndpoint>(apiBase, apiCall, authToken);
}
