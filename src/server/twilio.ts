import * as twilio from "twilio";

import { config } from "./config/config";
import { twilioApiKey } from "./config/DO_NOT_COMMIT.secrets.config";

export const twilioClient = new twilio(config.twilioSid, twilioApiKey);
