/**
 * Custom Koa middleware.
 */

import BadRequestError from "./errors/BadRequestError";

// TODO: Logging

/**
 * Handle BadRequestErrors.
 */
export async function handleErrors(ctx, next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof BadRequestError) {
      ctx.throw(400, error.message);
    } else {
      throw error;
    }
  }
}
