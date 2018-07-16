import {
  ValidateMobileNumberApiCall,
  validateMobileNumberApiLocation,
  ValidateMobileNumberApiEndpoint
} from "../../shared/routes/me/definitions";

import { callApi } from "../callApi";

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
