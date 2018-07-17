/**
 * Custom Koa middleware.
 */

import { Middleware } from "koa";
import { HttpApiError } from "../shared/errors/HttpApiError";

// TODO: Logging

/**
 * Handle ApiErrors.
 */
export const handleErrors: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(error);
    if (error instanceof HttpApiError) {
      const { statusCode, errorMessage, data } = error;
      ctx.status = statusCode;
      ctx.body = JSON.stringify({ message: errorMessage, data });
    } else {
      throw error;
    }
  }
};
