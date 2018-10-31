import { Config } from "../../config/config";
import { ValidateMobileNumberApiEndpoint } from "@raha/api-shared/dist/routes/me/definitions";
import { createApiRoute } from "..";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { twilioClient } from "../../twilio";
import { InvalidNumberError } from "@raha/api-shared/dist/errors/RahaApiError/me/validateMobileNumber/InvalidNumberError";
import { NotRealError } from "@raha/api-shared/dist/errors/RahaApiError/me/validateMobileNumber/NotRealError";
import { DisallowedTypeError } from "@raha/api-shared/dist/errors/RahaApiError/me/validateMobileNumber/DisallowedTypeError";

/**
 * An endpoint to validate phone numbers.
 * Checks if it meets our requirements, notably that the number is not a
 * VOIP or landline number.
 */
export const validateMobileNumber = (config: Config) =>
  createApiRoute<ValidateMobileNumberApiEndpoint>(async call => {
    const { mobileNumber } = call.body;

    if (!mobileNumber) {
      throw new MissingParamsError(["mobileNumber"]);
    }

    let phoneNumberLookup: any;
    try {
      phoneNumberLookup = await twilioClient.lookups
        .phoneNumbers(mobileNumber)
        .fetch({ type: "carrier" });
    } catch (e) {
      // TODO: this isn't always a user error, can be an internal server error.
      // Change to reflect that in API responses
      throw new InvalidNumberError(mobileNumber);
    }

    // Skip these checks if the number is a known debug number.
    // This is a preliminary mechanism that may be useful for iOS acceptance testing
    // down the line as well.
    if (config.debugNumbers.includes(mobileNumber)) {
      return { body: { message: mobileNumber }, status: 200 };
    }

    const allowedPhoneTypes = ["mobile"];

    if (!phoneNumberLookup || !phoneNumberLookup.phoneNumber) {
      throw new NotRealError(mobileNumber);
    }

    // Twilio cannot currently provide us with carrier info for Canadian numbers, so we are letting them through for now.
    // As of 10/5/2018, we have initiated a support request with Twilio to get access to this info.
    // https://support.twilio.com/hc/en-us/articles/360004563433-Twilio-Lookups-API-is-Not-Returning-Carrier-Data-for-Canadian-Phone-Numbers
    if (
      !phoneNumberLookup.countryCode ||
      phoneNumberLookup.countryCode !== "CA"
    ) {
      if (!phoneNumberLookup.carrier || !phoneNumberLookup.carrier.type) {
        console.info("Rejected number without carrier info:", mobileNumber);
        throw new NotRealError(mobileNumber);
      }

      if (!allowedPhoneTypes.includes(phoneNumberLookup.carrier.type)) {
        // Republic Wireless is a carrier that uses VoIP numbers but does not
        // actually give its users more than one number at a time. We're making a
        // special exception.
        if (
          !phoneNumberLookup.carrier.name ||
          !phoneNumberLookup.carrier.name.startsWith("Republic Wireless")
        ) {
          console.info(
            "Rejected disallowed number type:",
            mobileNumber,
            phoneNumberLookup.carrier
          );
          throw new DisallowedTypeError(
            mobileNumber,
            phoneNumberLookup.carrier.type
          );
        }
      }
    }

    return { body: { message: phoneNumberLookup.phoneNumber }, status: 200 };
  });
