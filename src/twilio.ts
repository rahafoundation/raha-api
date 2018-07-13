import * as twilio from "twilio";

import { config } from "./server/config/config";
import { twilioApiKey } from "./server/config/DO_NOT_COMMIT.secrets.config";

export const twilioClient = new twilio(config.twilioSid, twilioApiKey);
