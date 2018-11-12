import { Middleware } from "koa";

const CRON_HEADER_NAME = "X-Appengine-Cron";

/**
 * Middleware that verifies the presence of the X-Appengine-Cron header.
 *
 * This middleware is applied to AppEngine cron job request handlers to ensure
 * that the request actually came from AppEngine.
 * See: https://cloud.google.com/appengine/docs/flexible/nodejs/scheduling-jobs-with-cron-yaml#validating_cron_requests
 */
const verifyCronHeader: Middleware = async (ctx, next) => {
  const { headers } = ctx;
  if (!headers[CRON_HEADER_NAME] === true) {
    throw new Error(
      "Cron request does not appear to originate from AppEngine!"
    );
  }
  return next();
};

export { verifyCronHeader };
