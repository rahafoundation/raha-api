import { Middleware } from "koa";

/**
 * Middleware that blocks search engines from indexing this url.
 *
 * See: https://developers.google.com/search/reference/robots_meta_tag#using-the-x-robots-tag-http-header.
 */
const blockSearchEngineIndexing: Middleware = async (ctx, next) => {
  ctx.set("X-Robots-Tag", "none, noindex, nofollow");
  return next();
};

export { blockSearchEngineIndexing };
