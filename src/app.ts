#!/usr/bin/env node

import * as path from "path";
import { URL } from "url";
import * as Storage from "@google-cloud/storage";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as cors from "@koa/cors";
import * as Router from "koa-router";
import * as sgMail from "@sendgrid/mail";
import { DocumentSnapshot, Firestore } from "@google-cloud/firestore";
import * as adminLib from "firebase-admin";

import { getAdmin } from "./firebaseAdmin";
import { handleErrors } from "./middleware";
import { verifyFirebaseIdToken } from "./helpers/verifyFirebaseIdToken";
import * as meRoutes from "./routes/me";
import * as membersRoutes from "./routes/members";
import * as operationsRoutes from "./routes/operations";

import config from "./config/config";
import {
  coconutApiKey,
  sendgridApiKey
} from "./config/DO_NOT_COMMIT.secrets.config";
import { MemberId } from "./models/identifiers";

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

export interface LoggedInContext extends Koa.Context {
  state: {
    loggedInMemberToken: adminLib.auth.DecodedIdToken;
  };
}
export type RahaApiContext<
  Authenticated extends boolean
> = Authenticated extends true ? LoggedInContext : Koa.Context;

const publicRouter = new Router()
  .get("/api/operations", operationsRoutes.listOperations(operationsCollection))
  /* These endpoints are consumed by coconut. */
  .post(
    "/api/members/:memberId/notify_video_encoded",
    membersRoutes.notifyVideoEncoded
  )
  .post(
    "/api/members/:memberId/upload_video",
    membersRoutes.uploadVideo(config, storage, memberIdToVideoHashCollection)
  );

// TODO: remove typecasts once the following is resolved:
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/22568
app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods() as any);

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = new Router()
  .post(
    "/api/members/:memberId/request_invite",
    membersRoutes.requestInvite(
      config,
      storage,
      coconutApiKey,
      membersCollection,
      operationsCollection
    )
  )
  .post(
    "/api/members/:memberId/trust",
    membersRoutes.trust(membersCollection, operationsCollection)
  )
  .post(
    "/api/members/:memberId/give",
    membersRoutes.give(db, membersCollection, operationsCollection)
  )
  .post(
    "/api/me/mint",
    meRoutes.mint(db, membersCollection, operationsCollection)
  )
  .post(
    "/api/me/send_invite",
    meRoutes.sendInvite(config, sgMail, membersCollection)
  );

app.use(authenticatedRouter.routes());
app.use(authenticatedRouter.allowedMethods());

app.listen(process.env.PORT || 4000);
