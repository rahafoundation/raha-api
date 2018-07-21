import {
  SSODiscourseApiEndpoint,
  SSODiscourseApiCall,
  ssoDiscourseApiLocation
} from "@raha/api-shared/routes/sso/definitions";

import { callApi } from "../callApi";

/**
 * Validates the SSO payload and signature sent by Discourse and returns
 * the link for the client to use to redirect back to Discourse.
 * @param ssoRequestPayload The SSO payload sent by Discourse.
 * @param ssoRequestSignature The SSO signature sent by Discourse.
 */
export function getSSODiscourseRedirect(
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
