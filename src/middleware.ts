/**
 * Custom Koa middleware.
 */

import BadRequestError from "./errors/BadRequestError";
import { Middleware } from "koa";

// TODO: Logging

/**
 * Handle BadRequestErrors.
 */
export const handleErrors: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error(error);
    if (error instanceof BadRequestError) {
      ctx.throw(400, error.message);
    } else {
      throw error;
    }
  }
};
