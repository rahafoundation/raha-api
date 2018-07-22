import {
  ValidateMobileNumberApiCall,
  validateMobileNumberApiLocation,
  ValidateMobileNumberApiEndpoint
} from "@raha/api-shared/routes/me/definitions";

import { callApi } from "../callApi";

/**
 * API call for checking validity of mobile number. If it is invalid or
 * unacceptable by Raha (i.e. it's a voip number or landline number), will
 * return an error; On success, returns the E.164 formatted phone number (this
 * can also be calculated client-side).
 * @param mobileNumber Mobile number to validate
 */
export function validateMobileNumber(apiBase: string, mobileNumber: string) {
  const apiCall: ValidateMobileNumberApiCall = {
    location: validateMobileNumberApiLocation,
    request: {
      params: undefined,
      body: { mobileNumber }
    }
  };
  return callApi<ValidateMobileNumberApiEndpoint>(apiBase, apiCall, undefined);
}
