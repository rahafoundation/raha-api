import {
  SendAppInstallTextApiEndpoint,
  SendAppInstallTextApiCall,
  sendAppInstallTextApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";

import { callApi } from "../callApi";

/**
 * API call that sends a text to a mobile number with links to install the app.
 * @param mobileNumber E.164 formatted mobile number to send the text to.
 */
export function sendAppInstallText(apiBase: string, mobileNumber: string) {
  const apiCall: SendAppInstallTextApiCall = {
    location: sendAppInstallTextApiLocation,
    request: {
      params: undefined,
      body: { mobileNumber }
    }
  };
  return callApi<SendAppInstallTextApiEndpoint>(apiBase, apiCall, undefined);
}
