#!/usr/bin/env node

import path from "path";
import { URL } from "url";

import Koa from "koa";
import cors from "@koa/cors";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import * as coconut from "coconutjs";

import Storage from "@google-cloud/storage";
import { getAdmin } from "./firebaseAdmin";
import { verifyFirebaseIdToken } from "./verifyFirebaseIdToken";
import { firestore } from "firebase-admin";

const { coconut_api_key } = require("./DO_NOT_COMMIT.config.json");

const PRIVATE_VIDEO_BUCKET = "raha-5395e.appspot.com";
const PUBLIC_VIDEO_BUCKET = "raha-video";
const TEN_MINUTES = 1000 * 60 * 10;

let admin, storage;
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

const db = admin.firestore();
const members = db.collection("members");
const operations = db.collection("operations");

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
  return await next();
}

function getPrivateVideoRef(memberUid) {
  return storage
    .bucket(PRIVATE_VIDEO_BUCKET)
    .file(`private-video/${memberUid}/invite.mp4`);
}

function getPublicVideoRef(memberMid) {
  return storage
    .bucket(PUBLIC_VIDEO_BUCKET)
    .file(`public-video/${memberMid}/invite.mp4`);
}

async function createCoconutVideoEncodingJob(memberUid, creatorMid) {
  const videoRef = getPrivateVideoRef(memberUid);

  const temporaryAccessUrl = (await videoRef.getSignedUrl({
    action: "read",
    expires: Date.now() + TEN_MINUTES
  }))[0];

  const webhookUrl = new URL(
    `/api/members/${memberUid}/notify_video_encoded`,
    "https://raha-5395e.appspot.com"
  );
  const uploadUrl = new URL(
    `/api/members/${memberUid}/upload_video`,
    "https://raha-5395e.appspot.com"
  );
  uploadUrl.searchParams.append("mid", creatorMid);

  coconut.createJob(
    {
      api_key: coconut_api_key,
      source: temporaryAccessUrl,
      webhook: webhookUrl.toString(),
      outputs: {
        mp4: uploadUrl.toString()
      }
    },
    job => {
      if (job.status === "ok") {
        console.log("Coconut encoding job created successfully.");
        console.log(job.id);
      } else {
        console.error("Coconut encoding job error", job.error_code);
        console.error(job.error_message);
      }
    }
  );
}

const publicRouter = new Router()
  .param("uid", validateUid)
  .get("/api/operations", async ctx => {
    // TODO: Do we need to paginate?
    const ops = await operations.orderBy("created_at").get();
    const parsedOps: Array<Object> = [];
    ops.forEach(op =>
      parsedOps.push({
        id: op.id,
        creator_mid: op.get("creator_mid"),
        creator_uid: op.get("creator_uid"),
        op_code: op.get("op_code"),
        data: op.get("data")
      })
    );
    ctx.body = JSON.stringify(parsedOps);
    ctx.status = 200;
    return;
  })
  /* These endpoints are consumed by coconut. */
  .post("/api/members/:uid/notify_video_encoded", async ctx => {
    try {
      const videoRef = getPrivateVideoRef(ctx.state.toMember.id);
      if (await videoRef.exists()) {
        await videoRef.delete();
      }
      ctx.status = 200;
    } catch (error) {
      console.error(error);
      ctx.status = 500;
    }
    return;
  })
  .post("/api/members/:uid/upload_video", async ctx => {
    try {
      const { mid } = ctx.query;
      if (!mid) {
        ctx.status = 400;
        ctx.body = "Must supply MID when uploading video.";
        return;
      }

      const videoRef = getPublicVideoRef(mid);
      if (await videoRef.exists()) {
        ctx.status = 400;
        ctx.body =
          "Video already exists at intended storage destination. Cannot overwrite.";
        return;
      }

      await videoRef.save(ctx.request.body.encoded_video, { resumable: false });
      ctx.status = 201;
    } catch (error) {
      console.error(
        "An error occurred while saving an encoded video from Coconut."
      );
      console.error(error);
      ctx.status = 500;
    }
    return;
  });

app.use(publicRouter.routes());
app.use(publicRouter.allowedMethods());

// Put endpoints that don't need the user to be authenticated above this.
app.use(verifyFirebaseIdToken(admin));
// Put endpoints that do need the user to be authenticated below this.

const authenticatedRouter = new Router()
  .param("uid", validateUid)
  .post("/api/members/:uid/request_invite", async ctx => {
    const loggedInUid = ctx.state.user.uid;
    try {
      const { creatorMid, fullName } = ctx.request.body;
      const newOperation = {
        creator_mid: creatorMid,
        creator_uid: loggedInUid,
        op_code: "REQUEST_INVITE",
        data: {
          full_name: fullName,
          to_mid: ctx.state.toMember.get("mid"),
          to_uid: ctx.state.toMember.id
          // TODO: Eventually we need to extract file extension from this or a similar parameter.
          // Currently we only handle videos uploaded as invite.mp4.
          // video_url: ctx.request.body.videoUrl
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };

      createCoconutVideoEncodingJob(loggedInUid, creatorMid);

      // const newOperationDoc = await operations.add(newOperation);
      // ctx.body = {
      //   ...(await newOperationDoc.get()).data(),
      //   id: newOperationDoc.id
      // };
      ctx.body = newOperation;
      ctx.status = 201;
      return;
    } catch (error) {
      console.error(error);
      ctx.body = "An error occurred while creating this operation.";
      ctx.status = 500;
    }
  })
  .post("/api/members/:uid/trust", async ctx => {
    const loggedInUid = ctx.state.user.uid;
    const loggedInMember = await members.doc(loggedInUid).get();
    try {
      const newOperation = {
        creator_mid: loggedInMember.get("mid"),
        creator_uid: loggedInUid,
        op_code: "TRUST",
        data: {
          to_mid: ctx.state.toMember.get("mid"),
          to_uid: ctx.state.toMember.id
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };
      const newOperationDoc = await operations.add(newOperation);
      ctx.body = {
        ...(await newOperationDoc.get()).data(),
        id: newOperationDoc.id
      };
      ctx.status = 201;
      return;
    } catch (error) {
      console.error(error);
      ctx.body = "An error occurred while creating this operation.";
      ctx.status = 500;
    }
  });

app.use(authenticatedRouter.routes());
app.use(authenticatedRouter.allowedMethods());

app.listen(process.env.PORT || 4000);
