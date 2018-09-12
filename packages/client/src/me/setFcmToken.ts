import {
  SetFcmTokenApiEndpoint,
  SetFcmTokenApiCall,
  setFcmTokenApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";

/**
 * API call that updates the currently active FirebaseCloudMessaging
 * token for the currently signed-in member.
 */
export function setFcmToken(
  apiBase: string,
  authToken: string,
  fcmToken: string
) {
  const apiCall: SetFcmTokenApiCall = {
    location: setFcmTokenApiLocation,
    request: {
      params: undefined,
      body: { fcmToken }
    }
  };
  return callApi<SetFcmTokenApiEndpoint>(apiBase, apiCall, authToken);
}
