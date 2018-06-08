import * as adminLib from "firebase-admin";
import { Middleware } from "koa";

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const verifyFirebaseIdToken: (
  adminInstance: typeof adminLib
) => Middleware = admin => async (ctx, next) => {
  // tslint:disable-next-line:no-console
  console.log("Check if request is authorized with Firebase ID token");

  const { headers, cookies } = ctx;

  if (
    !headers.authorization ||
    !headers.authorization.startsWith("Bearer ")
    // TODO: determine if we should support session cookie as auth
    // && !cookies.__session
  ) {
    // tslint:disable-next-line:no-console
    console.error(
      "No Firebase ID token was passed as a Bearer token in the Authorization header.",
      "Make sure you authorize your request by providing the following HTTP header:",
      "Authorization: Bearer <Firebase ID Token>",
      'or by passing a "__session" cookie.'
    );
    ctx.status = 403;
    ctx.body = "Unauthorized.";
    return;
  }

  const idToken =
    headers.authorization && headers.authorization.startsWith("Bearer ")
      ? // Read the ID Token from the Authorization header.
        headers.authorization.split("Bearer ")[1]
      : undefined;
  // TODO: determine if we should support session cookie as auth
  // // Read the ID Token from cookie.
  //   cookies.__session;

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    ctx.state.loggedInMemberToken = decodedIdToken;
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.error("Error while verifying Firebase ID token:", error);
    ctx.status = 403;
    ctx.body = "Unauthorized.";
    return;
  }
  return next();
};

export { verifyFirebaseIdToken };
