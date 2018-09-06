#!/usr/bin/env node

import * as path from "path";
import * as Storage from "@google-cloud/storage";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as cors from "@koa/cors";
import * as Router from "koa-router";
import * as sgMail from "@sendgrid/mail";
import { Firestore } from "@google-cloud/firestore";
import * as adminLib from "firebase-admin";

import { getAdmin } from "./firebaseAdmin";
import { handleErrors } from "./middleware";
import { verifyFirebaseIdToken } from "./helpers/verifyFirebaseIdToken";
import * as meRoutes from "./routes/me";
import * as membersRoutes from "./routes/members";
import * as operationsRoutes from "./routes/operations";
import * as ssoRoutes from "./routes/sso";

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
  verifyMemberApiLocation
} from "@raha/api-shared/dist/routes/members/definitions";
import {
  sendInviteApiLocation,
  mintApiLocation,
  validateMobileNumberApiLocation,
  sendAppInstallTextApiLocation
} from "@raha/api-shared/dist/routes/me/definitions";
import { ssoDiscourseApiLocation } from "@raha/api-shared/dist/routes/sso/definitions";

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

const db: Firestore = admin.firestore();
const membersCollection = db.collection("members");
const operationsCollection = db.collection("operations");

sgMail.setApiKey(sendgridApiKey);

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
  {
    location: listOperationsApiLocation,
    handler: operationsRoutes.listOperations(operationsCollection)
  },
  {
    location: createMemberApiLocation,
    handler: membersRoutes.createMember(
      config,
      db,
      storage,
      membersCollection,
      operationsCollection
    )
  },
  {
    location: verifyMemberApiLocation,
    handler: membersRoutes.verify(
      config,
      db,
      storage,
      membersCollection,
      operationsCollection
    )
  },
  {
    location: trustMemberApiLocation,
    handler: membersRoutes.trust(db, membersCollection, operationsCollection)
  },
  {
    location: giveApiLocation,
    handler: membersRoutes.give(db, membersCollection, operationsCollection)
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
    location: ssoDiscourseApiLocation,
    handler: ssoRoutes.ssoDiscourse(config, membersCollection)
  }
];

function createRouter(routes: Array<RouteHandler<ApiLocation>>): Router {
  return routes.reduce((router, route) => {
    const { handler, location } = route;
    const { uri, method } = location;
    const fullUri = path.join("/api/", uri);
    switch (method as HttpVerb) {
      case HttpVerb.GET:
        return router.get(fullUri, handler);
      case HttpVerb.POST:
        return router.post(fullUri, handler);
      case HttpVerb.PUT:
        return router.put(fullUri, handler);
      case HttpVerb.PATCH:
        return router.patch(fullUri, handler);
      case HttpVerb.DELETE:
        return router.delete(fullUri, handler);
      default:
        // should be unreachable
        throw new Error("Invalid HTTP verb");
    }
  }, new Router());
}

const publicRouter = createRouter(
  apiRoutes.filter(r => !r.location.authenticated)
);

app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods());

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = createRouter(
  apiRoutes.filter(r => r.location.authenticated)
);

app.use(authenticatedRouter.routes());
app.use(authenticatedRouter.allowedMethods());

const port = process.env.PORT || 4000;
app.listen(port);

// tslint:disable-next-line:no-console
console.info(`Listening at localhost:${port}`);
