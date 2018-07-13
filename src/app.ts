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
import { verifyFirebaseIdToken } from "./server/helpers/verifyFirebaseIdToken";
import * as meRoutes from "./server/routes/me/index";
import * as membersRoutes from "./server/routes/members";
import * as operationsRoutes from "./server/routes/operations/index";

import { config } from "./server/config/config";
import {
  coconutApiKey,
  sendgridApiKey
} from "./server/config/DO_NOT_COMMIT.secrets.config";
import { createApiRoute } from "./server/routes";
import { HttpVerb } from "./server/helpers/http";
import { ApiLocation } from "./server/routes/ApiEndpoint/ApiCall";
import { listOperationsApiLocation } from "./server/routes/operations/definitions";
import {
  trustMemberApiLocation,
  requestInviteApiLocation,
  giveApiLocation
} from "./server/routes/members/definitions";
import {
  sendInviteApiLocation,
  mintApiLocation,
  migrateApiLocation
} from "./server/routes/me/definitions";

const isTestEnv = process.env.NODE_ENV === "test";
const credentialsPathArg =
  isTestEnv && process.argv.length > 2 ? process.argv[2] : undefined;
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
// TODO: rename uid to memberId in collection name
const memberIdToVideoHashCollection = db.collection("uidToVideoHashMap");

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
 * routes/ApiEndpoint/index.ts.
 */
const apiRoutes: Array<RouteHandler<ApiLocation>> = [
  {
    location: listOperationsApiLocation,
    handler: operationsRoutes.listOperations(operationsCollection)
  },
  {
    location: trustMemberApiLocation,
    handler: membersRoutes.trust(db, membersCollection, operationsCollection)
  },
  {
    location: requestInviteApiLocation,
    handler: membersRoutes.requestInvite(
      config,
      storage,
      coconutApiKey,
      membersCollection,
      operationsCollection
    )
  },
  {
    location: giveApiLocation,
    handler: membersRoutes.give(db, membersCollection, operationsCollection)
  },
  {
    location: sendInviteApiLocation,
    handler: meRoutes.sendInvite(config, sgMail, membersCollection)
  },
  {
    location: mintApiLocation,
    handler: meRoutes.mint(db, membersCollection, operationsCollection)
  },
  {
    location: migrateApiLocation,
    handler: meRoutes.migrate(db, membersCollection)
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
)
  // Coconut video encoding endpoints are not in apiRoutes nor ApiEndpoint for
  // now. Note: these routes explicitly prefix /api/, unlike the rest of them.
  .post(
    "/api/members/:memberId/notify_video_encoded",
    membersRoutes.notifyVideoEncoded
  )
  .post(
    "/api/members/:memberId/upload_video",
    membersRoutes.uploadVideo(config, storage, memberIdToVideoHashCollection)
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
