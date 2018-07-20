import {
  SSODiscourseApiEndpoint,
  SSODiscourseApiCall,
  ssoDiscourseApiLocation
} from "../../shared/routes/sso/definitions";

import { callApi } from "../callApi";

/**
 * API call that sends a text to a mobile number with links to install the app.
 * @param mobileNumber E.164 formatted mobile number to send the text to.
 */
export function sendAppInstallText(
  apiBase: string,
  authToken: string,
  ssoRequestPayload: string,
  ssoRequestSignature: string
) {
  const apiCall: SSODiscourseApiCall = {
    location: ssoDiscourseApiLocation,
    request: {
      params: undefined,
      body: { ssoRequestPayload, ssoRequestSignature }
    }
  };
  return callApi<SSODiscourseApiEndpoint>(apiBase, apiCall, authToken);
}
