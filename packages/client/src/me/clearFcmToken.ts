import {
  ClearFcmTokenApiEndpoint,
  ClearFcmTokenApiCall,
  clearFcmTokenApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";

/**
 * API call that updates the currently active FirebaseCloudMessaging
 * token for the currently signed-in member.
 */
export function clearFcmToken(apiBase: string, fcmToken: string) {
  const apiCall: ClearFcmTokenApiCall = {
    location: clearFcmTokenApiLocation,
    request: {
      params: undefined,
      body: { fcmToken }
    }
  };
  return callApi<ClearFcmTokenApiEndpoint>(apiBase, apiCall, undefined);
}
