import { SendAppInstallTextApiEndpoint } from "@raha/api-shared/dist/routes/me/definitions";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { ServerError } from "@raha/api-shared/dist/errors/RahaApiError/ServerError";

import { createApiRoute } from "..";
import { twilioClient } from "../../twilio";
import { Config } from "../../config/config";

export const sendAppInstallText = (config: Config) =>
  createApiRoute<SendAppInstallTextApiEndpoint>(async call => {
    const { mobileNumber } = call.body;

    if (!mobileNumber) {
      throw new MissingParamsError(["mobileNumber"]);
    }

    // Skip sending text if the number is a known debug number.
    // This is a preliminary mechanism that may be useful for iOS acceptance testing
    // down the line as well.
    if (config.debugNumbers.includes(mobileNumber)) {
      return { body: { message: "Install link sent!" }, status: 200 };
    }
    try {
      await twilioClient.messages.create({
        body:
          "Hi! You can download the Raha app at the following links.\n" +
          " Android: https://play.google.com/store/apps/details?id=app.raha.mobile\n" +
          " iOS: https://itunes.apple.com/app/raha/id1434224783?ls=1&mt=8",
        to: mobileNumber,
        from: config.twilio.fromNumber,
        // I don't think the Twilio SDK actually supports the Messaging Service feature atm.
        // Once we add multiple numbers that we'd like Twilio to use for localized text
        // messages, we should look into just making the REST API call directly.
        MessagingServiceSid: config.twilio.messagingServiceSid
      });
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
      throw new ServerError("There was an error sending the install text.");
    }

    return { body: { message: "Install link sent!" }, status: 200 };
  });
