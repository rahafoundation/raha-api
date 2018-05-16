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
import { verifyFirebaseIdToken } from "./verifyFirebaseIdToken";
import * as meRoutes from "./routes/me";
import * as membersRoutes from "./routes/members";
import * as operationsRoutes from "./routes/operations";

// tslint:disable-next-line:no-var-requires
const config = require("./config/config.json");
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
const members = db.collection("members");
const operations = db.collection("operations");
const uidToVideoHash = db.collection("uidToVideoHashMap");

sgMail.setApiKey(sendgridApiKey);

const app = new Koa();

app.use(cors());
app.use(bodyParser());

async function validateUid(uid, ctx, next) {
  const uidDoc = await members.doc(uid).get();
  if (!uidDoc.exists) {
    ctx.status = 404;
    return;
  }
  ctx.state.toMember = uidDoc;
  return next();
}

const publicRouter = new Router()
  .param("uid", validateUid)
  .get("/api/operations", operationsRoutes.index(operations))
  /* These endpoints are consumed by coconut. */
  .post(
    "/api/members/:uid/notify_video_encoded",
    membersRoutes.notifyVideoEncoded
  )
  .post(
    "/api/members/:uid/upload_video",
    membersRoutes.uploadVideo(config, storage, uidToVideoHash)
  );

app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods());

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = new Router()
  .param("uid", validateUid)
  .post(
    "/api/members/:uid/request_invite",
    membersRoutes.requestInvite(
      config,
      storage,
      coconutApiKey,
      members,
      operations
    )
  )
  .post("/api/members/:uid/trust", membersRoutes.trust(members, operations))
  .post("/api/members/:uid/give", membersRoutes.give(db, members, operations))
  .post("/api/me/mint", meRoutes.mint(db, members, operations))
  .post("/api/me/send_invite", meRoutes.sendInvite(config, sgMail, members));

app.use(authenticatedRouter.routes());
app.use(authenticatedRouter.allowedMethods());

app.listen(process.env.PORT || 4000);
