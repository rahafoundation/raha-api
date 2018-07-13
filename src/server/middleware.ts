/**
 * Custom Koa middleware.
 */

import { Middleware } from "koa";
import { ApiError } from "./errors/ApiError";

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
    if (error instanceof ApiError) {
      const { statusCode, errorMessage } = error;
      ctx.throw(error.statusCode, errorMessage);
    } else {
      throw error;
    }
  }
};
