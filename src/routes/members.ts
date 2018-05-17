import crypto from "crypto";
import { URL } from "url";

import {
  CollectionReference,
  DocumentSnapshot,
  Firestore
} from "@google-cloud/firestore";
import Storage from "@google-cloud/storage";
import asyncBusboy from "async-busboy";
import Big from "big.js";
import * as coconut from "coconutjs";
import { firestore } from "firebase-admin";

import BadRequestError from "../errors/BadRequestError";

const TEN_MINUTES = 1000 * 60 * 10;
const DEFAULT_DONATION_RECIPIENT_UID = "RAHA";
const DEFAULT_DONATION_RATE = 0.03;

function getPrivateVideoRef(
  config,
  storage: Storage.Storage,
  memberUid: string
): Storage.File {
  return storage
    .bucket(config.privateVideoBucket)
    .file(`private-video/${memberUid}/invite.mp4`);
}

function getPublicVideoRef(
  config,
  storage: Storage.Storage,
  memberMid: string
): Storage.File {
  return storage
    .bucket(config.publicVideoBucket)
    .file(`${memberMid}/invite.mp4`);
}

async function createCoconutVideoEncodingJob(
  config,
  storage: Storage.Storage,
  coconutApiKey: string,
  memberUid: string,
  creatorMid: string
) {
  const videoRef = getPrivateVideoRef(config, storage, memberUid);

  const temporaryAccessUrl = (await videoRef.getSignedUrl({
    action: "read",
    expires: Date.now() + TEN_MINUTES
  }))[0];

  const webhookUrl = new URL(
    `members/${memberUid}/notify_video_encoded`,
    config.apiBase
  );
  const uploadUrl = new URL(
    `members/${memberUid}/upload_video`,
    config.apiBase
  );
  uploadUrl.searchParams.append("mid", creatorMid);

  coconut.createJob(
    {
      api_key: coconutApiKey,
      source: temporaryAccessUrl,
      webhook: webhookUrl.toString(),
      outputs: {
        mp4: uploadUrl.toString()
      }
    },
    job => {
      if (job.status === "ok") {
        // tslint:disable-next-line:no-console
        console.log("Coconut encoding job created successfully.");
        // tslint:disable-next-line:no-console
        console.log(job.id);
      } else {
        // tslint:disable-next-line:no-console
        console.error("Coconut encoding job error", job.error_code);
        // tslint:disable-next-line:no-console
        console.error(job.error_message);
      }
    }
  );
}

/**
 * Reads the entire stream of video data into a Buffer.
 * @param videoStream ReadableStream of video data.
 */
function getVideoBufferFromStream(videoStream): Promise<Buffer> {
  const buffers: Buffer[] = [];
  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    videoStream.on("data", (data: Buffer) => {
      buffers.push(data);
    });
    videoStream.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
  videoStream.resume();
  return bufferPromise;
}

/**
 * Calculate the hex-encoded sha256 hash of the video.
 * @param videoBuffer Buffer of video data.
 */
function getHashFromVideoBuffer(videoBuffer: Buffer): string {
  const hash = crypto.createHash("sha256");
  hash.update(videoBuffer);
  return hash.digest("hex");
}

export const notifyVideoEncoded = ctx => {
  ctx.status = 200;
};

export const uploadVideo = (
  config,
  storage: Storage.Storage,
  uidToVideoHash: CollectionReference
) => async ctx => {
  const { mid } = ctx.query;
  if (!mid) {
    throw new BadRequestError("Must supply MID when uploading video.");
  }

  const publicVideoRef = getPublicVideoRef(
    config,
    storage,
    decodeURIComponent(mid)
  );
  if ((await publicVideoRef.exists())[0]) {
    throw new BadRequestError(
      "Video already exists at intended storage destination. Cannot overwrite."
    );
  }

  const reqType = ctx.request.type;
  if (reqType !== "multipart/form-data") {
    ctx.status = 400;
    ctx.body = "Must submit data as multipart/form-data";
    return;
  }

  const { files } = await asyncBusboy(ctx.req);
  const encodedVideo = files.filter(file => file.fieldname === "encoded_video");
  if (encodedVideo.length !== 1) {
    throw new BadRequestError(
      "Zero or multiple encoded videos supplied with request."
    );
  }

  const videoBuf = await getVideoBufferFromStream(encodedVideo[0]);
  const hash = getHashFromVideoBuffer(videoBuf);

  const hashMappingRef = uidToVideoHash.doc(ctx.state.toMember.id);
  if ((await hashMappingRef.get()).exists) {
    throw new BadRequestError(
      "Invite video already exists for specified user."
    );
  }
  await hashMappingRef.create({
    hash
  });

  await publicVideoRef.save(videoBuf);

  const privateVideoRef = getPrivateVideoRef(
    config,
    storage,
    ctx.state.toMember.id
  );
  if ((await privateVideoRef.exists())[0]) {
    await privateVideoRef.delete();
  } else {
    // tslint:disable-next-line:no-console
    console.warn("We expected a private video file to exist that did not.");
  }

  ctx.status = 201;
};

export const requestInvite = (
  config,
  storage: Storage.Storage,
  coconutApiKey: string,
  members: CollectionReference,
  operations: CollectionReference
) => async ctx => {
  const loggedInUid = ctx.state.user.uid;
  const loggedInMemberRef = members.doc(loggedInUid);

  if ((await loggedInMemberRef.get()).exists) {
    throw new BadRequestError("You have already requested an invite.");
  }

  const { creatorMid, fullName } = ctx.request.body;
  const requestingInviteFromMid = ctx.state.toMember.get("mid");
  const requestingInviteFromUid = ctx.state.toMember.id;

  const newOperation = {
    creator_mid: creatorMid,
    creator_uid: loggedInUid,
    op_code: "REQUEST_INVITE",
    data: {
      full_name: fullName,
      to_mid: requestingInviteFromMid,
      to_uid: requestingInviteFromUid
      // TODO: Eventually we need to extract file extension from this or a similar parameter.
      // Currently we only handle videos uploaded as invite.mp4.
      // video_url: ctx.request.body.videoUrl
    },
    created_at: firestore.FieldValue.serverTimestamp()
  };
  const newMember = {
    mid: creatorMid,
    full_name: fullName,
    request_invite_from_uid: requestingInviteFromUid,
    request_invite_from_mid: requestingInviteFromMid,
    created_at: firestore.FieldValue.serverTimestamp(),
    request_invite_block_at: null,
    request_invite_block_seq: null,
    request_invite_op_seq: null
  };

  createCoconutVideoEncodingJob(
    config,
    storage,
    coconutApiKey,
    loggedInUid,
    creatorMid
  );

  const newOperationDoc = await operations.add(newOperation);
  await loggedInMemberRef.create(newMember);
  ctx.body = {
    ...(await newOperationDoc.get()).data(),
    id: newOperationDoc.id
  };
  ctx.status = 201;
};

export const trust = (
  members: CollectionReference,
  operations: CollectionReference
) => async ctx => {
  const loggedInUid = ctx.state.user.uid;
  const loggedInMember = await members.doc(loggedInUid).get();
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
};

export const give = (
  db: Firestore,
  members: CollectionReference,
  operations: CollectionReference
) => async ctx => {
  const newOperationReference = await db.runTransaction(async transaction => {
    const loggedInUid = ctx.state.user.uid;
    const loggedInMember = await transaction.get(members.doc(loggedInUid));
    const toMember = await transaction.get(
      (ctx.state.toMember as DocumentSnapshot).ref
    );
    const { amount } = ctx.request.body;

    const donationRecipient = await transaction.get(
      members.doc(
        ctx.state.toMember.get("donation_to") || DEFAULT_DONATION_RECIPIENT_UID
      )
    );

    if (donationRecipient === undefined) {
      throw new BadRequestError("Donation recipient does not exist.");
    }

    const fromBalance = new Big(loggedInMember.get("raha_balance") || 0);
    const toBalance = new Big(toMember.get("raha_balance") || 0);
    const donationRecipientBalance = new Big(
      donationRecipient.get("raha_balance") || 0
    );

    const donationRate = new Big(
      ctx.state.toMember.get("donation_rate") || DEFAULT_DONATION_RATE
    );
    const bigAmount = new Big(amount);
    // Round to 2 decimal places and using rounding mode 0 = round down.
    const donationAmount = bigAmount.times(donationRate).round(2, 0);
    const toAmount = bigAmount.minus(donationAmount);

    const newFromBalance = fromBalance.minus(bigAmount);
    if (newFromBalance.lt(0)) {
      throw new BadRequestError("Amount exceeds account balance.");
    }

    const newOperation = {
      creator_uid: loggedInUid,
      op_code: "GIVE",
      data: {
        to_uid: toMember.id,
        amount: toAmount.toString(),
        donation_to: donationRecipient.id,
        donation_amount: donationAmount.toString()
      },
      created_at: firestore.FieldValue.serverTimestamp()
    };

    const newOperationRef = operations.doc();

    transaction
      .update(loggedInMember.ref, {
        raha_balance: newFromBalance.toString()
      })
      .update(toMember.ref, {
        raha_balance: toBalance.plus(bigAmount).toString()
      })
      .update(donationRecipient.ref, {
        raha_balance: donationRecipientBalance.plus(donationAmount).toString()
      })
      .set(newOperationRef, newOperation);
    return newOperationRef;
  });

  ctx.body = {
    ...(await newOperationReference.get()).data(),
    id: newOperationReference.id
  };
  ctx.status = 201;
};
