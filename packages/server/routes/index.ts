import { ApiEndpoint } from "@raha/api-shared/routes/ApiEndpoint";
import { AuthenticatedContext, RahaApiContext } from "../app";

export type ApiHandler<Def extends ApiEndpoint> = (
  request: {
    params: Def["call"]["request"]["params"];
    body: Def["call"]["request"]["body"];
  },
  loggedInMemberToken: Def["call"]["location"]["authenticated"] extends true
    ? AuthenticatedContext["state"]["loggedInMemberToken"]
    : undefined
) => Promise<Def["response"]>;

/**
 * Extracts data necessary to process an API call from the context,
 * computes the response and then returns it.
 * @param endpoint Endpoint being hit
 * @param apiHandler Handler for that endpoint
 */
export function createApiRoute<Def extends ApiEndpoint>(
  apiHandler: ApiHandler<Def>
): (
  ctx: RahaApiContext<Def["call"]["location"]["authenticated"]>
) => Promise<void> {
  return async ctx => {
    const { status, body } = await apiHandler(
      {
        params: ctx.params,
        body: ctx.request.body
      },
      ctx.state.loggedInMemberToken
    );
    ctx.status = status;
    ctx.body = JSON.stringify(body);
    return;
  };
}
