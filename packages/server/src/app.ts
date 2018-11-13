#!/usr/bin/env node

import * as path from "path";
import * as Storage from "@google-cloud/storage";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as cors from "@koa/cors";
import * as Router from "koa-router";
import * as sgMail from "@sendgrid/mail";
import * as sgClient from "@sendgrid/client";
import { Firestore } from "@google-cloud/firestore";
import * as adminLib from "firebase-admin";

import { getAdmin } from "./firebaseAdmin";
import { handleErrors } from "./middleware";
import { verifyFirebaseIdToken } from "./helpers/verifyFirebaseIdToken";
import * as meRoutes from "./routes/me";
import * as membersRoutes from "./routes/members";
import * as operationsRoutes from "./routes/operations";
import * as ssoRoutes from "./routes/sso";
import * as cronRouteHandlers from "./routes/cron";

import { config } from "./config/config";
import { sendgridApiKey } from "./config/DO_NOT_COMMIT.secrets.config";
import { createApiRoute } from "./routes";
import { HttpVerb } from "@raha/api-shared/dist/helpers/http";
import { ApiLocation } from "@raha/api-shared/dist/routes/ApiEndpoint/ApiCall";
import { listOperationsApiLocation } from "@raha/api-shared/dist/routes/operations/definitions";
import {
  trustMemberApiLocation,
  giveApiLocation,
  createMemberApiLocation,
  verifyMemberApiLocation,
  listMembersApiLocation,
  flagMemberApiLocation,
  resolveFlagMemberApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";
import {
  sendInviteApiLocation,
  mintApiLocation,
  validateMobileNumberApiLocation,
  sendAppInstallTextApiLocation,
  clearFcmTokenApiLocation,
  setFcmTokenApiLocation,
  editMemberApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";
import { ssoDiscourseApiLocation } from "@raha/api-shared/dist/routes/sso/definitions";
import { verifyCronHeader } from "./helpers/verifyCronHeader";
import { cronNotifyOnUnmintedApiLocation } from "@raha/api-shared/dist/routes/cron/definitions";

const isDevEnv = process.env.NODE_ENV === "development";
const credentialsPathArg =
  isDevEnv && process.env.FIREBASE_CREDENTIALS_PATH
    ? process.env.FIREBASE_CREDENTIALS_PATH
    : undefined;
const credentialsPath = credentialsPathArg
  ? path.isAbsolute(credentialsPathArg)
    ? credentialsPathArg
    : path.join(process.cwd(), credentialsPathArg)
  : undefined;

const admin = credentialsPath ? getAdmin(credentialsPath) : getAdmin();
// TODO: explain why we have different storage backends for test, or
// unify them.
const storage = credentialsPath ? admin.storage() : Storage();

const messaging = admin.messaging();

const auth = admin.auth();

const db: Firestore = admin.firestore();
const membersCollection = db.collection("members");
const operationsCollection = db.collection("operations");
const fmcTokensCollection = db.collection("firebaseCloudMessagingTokens");
const notificationHistoryCollection = db.collection("notificationHistory");

sgMail.setApiKey(sendgridApiKey);
sgClient.setApiKey(sendgridApiKey);

const app = new Koa();

app.use(cors());
app.use(bodyParser());
app.use(handleErrors);

export interface UnauthenticatedContext extends Koa.Context {}
export interface AuthenticatedContext extends Koa.Context {
  state: {
    loggedInMemberToken: adminLib.auth.DecodedIdToken;
  };
}
export type RahaApiContext<
  Authenticated extends boolean
> = Authenticated extends true ? AuthenticatedContext : UnauthenticatedContext;

/**
 * The location of an API endpoint. Uri may contain wildcards that must be
 * resolved, and only represents a path without a domain to send the request to.
 */
interface RouteHandler<Location extends ApiLocation> {
  location: Location;
  handler: ReturnType<typeof createApiRoute>;
}

/**
 * List of API endpoints the server can respond to.
 *
 * If you add a new route or modify an existing one's signature, edit it here.
 * Also ensure you add routes to the ApiEndpoint type in
 * routes/routes/ApiEndpoint/index.ts.
 */
const apiRoutes: Array<RouteHandler<ApiLocation>> = [
  // operations
  {
    location: listOperationsApiLocation,
    handler: operationsRoutes.listOperations(operationsCollection)
  },
  // members
  {
    location: listMembersApiLocation,
    handler: membersRoutes.listMembers(membersCollection)
  },
  {
    location: createMemberApiLocation,
    handler: membersRoutes.createMember(
      config,
      db,
      storage,
      messaging,
      membersCollection,
      operationsCollection,
      fmcTokensCollection,
      sgClient
    )
  },
  {
    location: trustMemberApiLocation,
    handler: membersRoutes.trust(db, membersCollection, operationsCollection)
  },
  {
    location: giveApiLocation,
    handler: membersRoutes.give(
      db,
      messaging,
      membersCollection,
      operationsCollection,
      fmcTokensCollection
    )
  },
  {
    location: verifyMemberApiLocation,
    handler: membersRoutes.verify(
      config,
      db,
      storage,
      messaging,
      membersCollection,
      operationsCollection,
      fmcTokensCollection
    )
  },
  {
    location: flagMemberApiLocation,
    handler: membersRoutes.flagMember(
      db,
      messaging,
      membersCollection,
      operationsCollection,
      fmcTokensCollection
    )
  },
  {
    location: resolveFlagMemberApiLocation,
    handler: membersRoutes.resolveFlagMember(
      db,
      messaging,
      membersCollection,
      operationsCollection,
      fmcTokensCollection
    )
  },
  // me
  {
    location: editMemberApiLocation,
    handler: meRoutes.editMember(db, membersCollection, operationsCollection)
  },
  {
    location: sendInviteApiLocation,
    handler: meRoutes.sendInvite(
      config,
      sgMail,
      membersCollection,
      operationsCollection
    )
  },
  {
    location: mintApiLocation,
    handler: meRoutes.mint(db, membersCollection, operationsCollection)
  },
  {
    location: validateMobileNumberApiLocation,
    handler: meRoutes.validateMobileNumber(config)
  },
  {
    location: sendAppInstallTextApiLocation,
    handler: meRoutes.sendAppInstallText(config)
  },
  {
    location: clearFcmTokenApiLocation,
    handler: meRoutes.clearFcmToken(fmcTokensCollection)
  },
  {
    location: setFcmTokenApiLocation,
    handler: meRoutes.setFcmToken(membersCollection, fmcTokensCollection)
  },
  // sso
  {
    location: ssoDiscourseApiLocation,
    handler: ssoRoutes.ssoDiscourse(config, membersCollection)
  }
];

// List of all routes that handle AppEngine cron jobs.
const cronRoutes: Array<RouteHandler<ApiLocation>> = [
  {
    location: cronNotifyOnUnmintedApiLocation,
    handler: cronRouteHandlers.notifyOnUnminted(
      auth,
      db,
      messaging,
      membersCollection,
      fmcTokensCollection,
      notificationHistoryCollection
    )
  }
];

function createRouter(routerConfig: {
  prefix: string;
  routes: Array<RouteHandler<ApiLocation>>;
  preMiddleware?: Koa.Middleware[];
  postMiddleware?: Koa.Middleware[];
}): Router {
  const { prefix, routes, preMiddleware, postMiddleware } = routerConfig;
  return routes.reduce((router, route) => {
    const { handler, location } = route;
    const { uri, method, authenticated } = location;
    const fullUri = path.join(`/${prefix}/`, uri);
    const routeHandlers = [
      ...(authenticated ? [verifyFirebaseIdToken(admin)] : []),
      ...(preMiddleware || []),
      handler,
      ...(postMiddleware || [])
    ];
    switch (method as HttpVerb) {
      case HttpVerb.GET:
        return router.get(fullUri, ...routeHandlers);
      case HttpVerb.POST:
        return router.post(fullUri, ...routeHandlers);
      case HttpVerb.PUT:
        return router.put(fullUri, ...routeHandlers);
      case HttpVerb.PATCH:
        return router.patch(fullUri, ...routeHandlers);
      case HttpVerb.DELETE:
        return router.delete(fullUri, ...routeHandlers);
      default:
        // should be unreachable
        throw new Error("Invalid HTTP verb");
    }
  }, new Router());
}

const apiRouter = createRouter({
  prefix: "api",
  routes: apiRoutes
});
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

const cronRouter = createRouter({
  prefix: "cron",
  routes: cronRoutes,
  preMiddleware: [verifyCronHeader]
});
app.use(cronRouter.routes());
app.use(cronRouter.allowedMethods());

const port = process.env.PORT || 4000;
app.listen(port);

// tslint:disable-next-line:no-console
console.info(`Listening at localhost:${port}`);
