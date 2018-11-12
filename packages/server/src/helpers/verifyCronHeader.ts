import { Middleware } from "koa";
import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";

const CRON_HEADER_NAME = "x-appengine-cron";

/**
 * Middleware that verifies the presence of the X-Appengine-Cron header.
 *
 * This middleware is applied to AppEngine cron job request handlers to ensure
 * that the request actually came from AppEngine.
 * See: https://cloud.google.com/appengine/docs/flexible/nodejs/scheduling-jobs-with-cron-yaml#validating_cron_requests
 */
const verifyCronHeader: Middleware = async (ctx, next) => {
  const { headers } = ctx;
  console.log(headers);
  if (headers[CRON_HEADER_NAME] !== "true") {
    throw new HttpApiError(
      403,
      "Cron request does not appear to originate from AppEngine!",
      {}
    );
  }
  return next();
};

export { verifyCronHeader };
