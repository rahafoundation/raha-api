#!/usr/bin/env node

import path from "path";
import { URL } from "url";
import Storage from "@google-cloud/storage";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import Router from "koa-router";
import sgMail from "@sendgrid/mail";
import { DocumentSnapshot, Firestore } from "@google-cloud/firestore";

import { getAdmin } from "./firebaseAdmin";
import { handleErrors } from "./middleware";
import { verifyFirebaseIdToken } from "./verifyFirebaseIdToken";
import * as meRoutes from "./routes/me";
import * as membersRoutes from "./routes/members";
import * as operationsRoutes from "./routes/operations";

import config from "./config/config";
import {
  coconutApiKey,
  sendgridApiKey
} from "./config/DO_NOT_COMMIT.secrets.config";

let admin;
let storage: Storage.Storage;
if (process.env.NODE_ENV === "test" && process.argv.length > 2) {
  const credentialsPathArg = process.argv[2];
  if (path.isAbsolute(credentialsPathArg)) {
    admin = getAdmin(credentialsPathArg);
  } else {
    // Resolve the path relative to the cwd.
    admin = getAdmin(
      path.resolve(path.join(process.cwd(), credentialsPathArg))
    );
  }
  storage = admin.storage();
} else {
  admin = getAdmin();
  storage = Storage();
}

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

async function validateMemberId(id, ctx, next) {
  const memberDoc = await membersCollection.doc(id).get();
  if (!memberDoc.exists) {
    ctx.throw(404, "This member does not exist!");
    return;
  }
  ctx.state.toMember = memberDoc;
  return next();
}

const publicRouter = new Router()
  .param("memberId", validateMemberId)
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

app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods());

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = new Router()
  .param("memberId", validateMemberId)
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
