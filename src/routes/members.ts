import * as crypto from "crypto";
import * as httpStatus from "http-status";
import { URL } from "url";

import { CollectionReference, Firestore } from "@google-cloud/firestore";
import * as Storage from "@google-cloud/storage";
import * as asyncBusboy from "async-busboy";
import Big from "big.js";
import * as coconut from "coconutjs";
import { firestore, storage as adminStorage } from "firebase-admin";

import ApiError from "../errors/ApiError";
import {
  Operation,
  OperationToBeCreated,
  OperationType
} from "../models/Operation";
import { MemberId } from "../models/identifiers";
import {
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointDefinition,
  ApiEndpointUri
} from "./ApiEndpoint";
import { createApiRoute } from "./";
import { OperationApiResponseBody } from "./ApiEndpoint/ApiResponse";
import { Config } from "../config/prod.config";
import { Readable as ReadableStream } from "stream";
import { getMemberById } from "../models/Member";
import { Context } from "koa";
import { HttpVerb } from "../helpers/http";
import { ApiLocationDefinition } from "./ApiEndpoint/ApiCall";

const TEN_MINUTES = 1000 * 60 * 10;
const DEFAULT_DONATION_RECIPIENT_UID = "RAHA";
const DEFAULT_DONATION_RATE = 0.03;

type BucketStorage = adminStorage.Storage | Storage.Storage;
function getPrivateVideoRef(
  config: Config,
  storage: BucketStorage,
  memberUid: string
): Storage.File {
  // TODO: this is a quick hack to make the types work out because test and prod
  // use different storage backends; see the corresponding TODO in app.ts
  return (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${memberUid}/invite.mp4`);
}

function getPublicVideoRef(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return (storage as Storage.Storage)
    .bucket(config.publicVideoBucket)
    .file(`${uid}/invite.mp4`);
}

async function createCoconutVideoEncodingJob(
  config: Config,
  storage: BucketStorage,
  coconutApiKey: string,
  memberUid: string
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

  coconut.createJob(
    {
      api_key: coconutApiKey,
      source: temporaryAccessUrl,
      webhook: webhookUrl.toString(),
      outputs: {
        mp4: uploadUrl.toString()
      }
    },
    (job: any) => {
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
 * @param videoStream stream of video data.
 */
function getVideoBufferFromStream(
  videoStream: ReadableStream
): Promise<Buffer> {
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

/**
 * Endpoint coconut calls to notify an uploaded video has been successfully
 * encoded. Not intended to be called by a user, so doesn't go through the
 * `createApiRoute` flow.
 */
export const notifyVideoEncoded = (ctx: Context) => {
  ctx.status = 200;
};

/**
 * Endpoint to upload a user's invite video.
 * Doesn't go through the `createApiRoute` flow.
 *
 * TODO: should it use `createApiRoute` and have documented types?
 */
export const uploadVideo = (
  config: Config,
  storage: BucketStorage,
  uidToVideoHash: CollectionReference
) => async (ctx: Context) => {
  const publicVideoRef = getPublicVideoRef(
    config,
    storage,
    ctx.state.toMember.id
  );
  if ((await publicVideoRef.exists())[0]) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
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
  const encodedVideo = files.filter(
    (file: any) => file.fieldname === "encoded_video"
  );
  if (encodedVideo.length !== 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Zero or multiple encoded videos supplied with request."
    );
  }

  const videoBuf = await getVideoBufferFromStream(encodedVideo[0]);
  const hash = getHashFromVideoBuffer(videoBuf);

  const hashMappingRef = uidToVideoHash.doc(ctx.state.toMember.id);
  if ((await hashMappingRef.get()).exists) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
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

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type RequestInviteApiLocation = ApiLocationDefinition<
  ApiEndpointUri.REQUEST_INVITE,
  HttpVerb.POST,
  true
>;
export const requestInviteApiLocation: RequestInviteApiLocation = {
  uri: ApiEndpointUri.REQUEST_INVITE,
  method: HttpVerb.POST,
  authenticated: true
};
export type RequestInviteApiCall = ApiCallDefinition<
  RequestInviteApiLocation["uri"],
  RequestInviteApiLocation["method"],
  RequestInviteApiLocation["authenticated"],
  { memberId: MemberId },
  { fullName: string; videoUrl: string; username: string }
>;
export type RequestInviteApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;

export type RequestInviteApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.REQUEST_INVITE,
  RequestInviteApiCall,
  RequestInviteApiResponse
>;

export const requestInvite = (
  config: Config,
  storage: BucketStorage,
  coconutApiKey: string,
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
) =>
  createApiRoute<RequestInviteApiEndpoint>(
    async (call, loggedInMemberToken) => {
      const loggedInUid = loggedInMemberToken.uid;
      const loggedInMemberRef = membersCollection.doc(loggedInUid);

      if ((await loggedInMemberRef.get()).exists) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "You have already requested an invite."
        );
      }

      const { username, fullName } = call.body;
      const requestingFromId = call.params.memberId;
      const requestingFromMember = await getMemberById(
        membersCollection,
        requestingFromId
      );
      if (!requestingFromMember) {
        throw new ApiError(httpStatus.NOT_FOUND);
      }

      const newOperation: OperationToBeCreated = {
        creator_uid: loggedInUid,
        op_code: OperationType.REQUEST_INVITE,
        data: {
          username,
          full_name: fullName,
          to_uid: requestingFromId
          // TODO: Eventually we need to extract file extension from this or a similar parameter.
          // Currently we only handle videos uploaded as invite.mp4.
          // video_url: ctx.request.body.videoUrl
        },
        created_at: firestore.FieldValue.serverTimestamp()
      };
      const newMember = {
        username,
        full_name: fullName,
        request_invite_from_uid: requestingFromId,
        created_at: firestore.FieldValue.serverTimestamp(),
        request_invite_block_at: null,
        request_invite_block_seq: null,
        request_invite_op_seq: null
      };

      createCoconutVideoEncodingJob(
        config,
        storage,
        coconutApiKey,
        loggedInUid
      );

      const newOperationDoc = await operationsCollection.add(newOperation);
      await loggedInMemberRef.create(newMember);
      return {
        body: {
          ...(await newOperationDoc.get()).data(),
          id: newOperationDoc.id
        } as Operation,
        status: 201
      };
    }
  );

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type TrustMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.TRUST_MEMBER,
  HttpVerb.POST,
  true
>;
export const trustMemberApiLocation: TrustMemberApiLocation = {
  uri: ApiEndpointUri.TRUST_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type TrustMemberApiCall = ApiCallDefinition<
  TrustMemberApiLocation["uri"],
  TrustMemberApiLocation["method"],
  TrustMemberApiLocation["authenticated"],
  { memberId: MemberId },
  void
>;
export type TrustMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type TrustMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.TRUST_MEMBER,
  TrustMemberApiCall,
  TrustMemberApiResponse
>;
/**
 * Create a trust relationship to a target member from the logged in member
 */
export const trust = (
  membersCollection: CollectionReference,
  operationsCollection: CollectionReference
) =>
  createApiRoute<TrustMemberApiEndpoint>(async (call, loggedInMemberToken) => {
    const loggedInUid = loggedInMemberToken.uid;
    const memberToTrustId = call.params.memberId;
    if (!(await getMemberById(membersCollection, memberToTrustId))) {
      throw new ApiError(httpStatus.NOT_FOUND, "Member to trust not found.");
    }

    const newOperation: OperationToBeCreated = {
      creator_uid: loggedInUid,
      op_code: OperationType.TRUST,
      data: {
        to_uid: memberToTrustId
      },
      created_at: firestore.FieldValue.serverTimestamp()
    };
    const newOperationDoc = await operationsCollection.add(newOperation);
    return {
      body: {
        ...(await newOperationDoc.get()).data(),
        id: newOperationDoc.id
      } as Operation,
      status: 201
    };
  });

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type GiveApiLocation = ApiLocationDefinition<
  ApiEndpointUri.GIVE,
  HttpVerb.POST,
  true
>;
export const giveApiLocation: GiveApiLocation = {
  uri: ApiEndpointUri.GIVE,
  method: HttpVerb.POST,
  authenticated: true
};
export type GiveApiCall = ApiCallDefinition<
  GiveApiLocation["uri"],
  GiveApiLocation["method"],
  GiveApiLocation["authenticated"],
  { memberId: MemberId },
  { amount: string; memo?: string }
>;
export type GiveApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type GiveApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.GIVE,
  GiveApiCall,
  GiveApiResponse
>;

/**
 * Give Raha to a target member from the logged in member.
 */
export const give = (
  db: Firestore,
  membersCollection: CollectionReference,
  operations: CollectionReference
) =>
  createApiRoute<GiveApiEndpoint>(async (call, loggedInMemberToken) => {
    const newOperationReference = await db.runTransaction(async transaction => {
      const loggedInMemberId = loggedInMemberToken.uid;
      const loggedInMember = await transaction.get(
        membersCollection.doc(loggedInMemberId)
      );

      const memberToGiveToId = call.params.memberId;
      const memberToGiveTo = await getMemberById(
        membersCollection,
        memberToGiveToId
      );
      if (!memberToGiveTo) {
        throw new ApiError(httpStatus.NOT_FOUND, "Member to trust not found.");
      }

      const { amount, memo } = call.body;

      const donationRecipient = await transaction.get(
        membersCollection.doc(
          memberToGiveTo.get("donation_to") || DEFAULT_DONATION_RECIPIENT_UID
        )
      );

      if (donationRecipient === undefined) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Donation recipient does not exist."
        );
      }

      const fromBalance = new Big(loggedInMember.get("raha_balance") || 0);
      const toBalance = new Big(memberToGiveTo.get("raha_balance") || 0);
      const donationRecipientBalance = new Big(
        donationRecipient.get("raha_balance") || 0
      );

      const donationRate = new Big(
        memberToGiveTo.get("donation_rate") || DEFAULT_DONATION_RATE
      );
      const bigAmount = new Big(amount);
      // Round to 2 decimal places and using rounding mode 0 = round down.
      const donationAmount = bigAmount.times(donationRate).round(2, 0);
      const toAmount = bigAmount.minus(donationAmount);

      const newFromBalance = fromBalance.minus(bigAmount);
      if (newFromBalance.lt(0)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Amount exceeds account balance."
        );
      }

      const transactionMemo: string = memo ? memo : "";

      const newOperation: OperationToBeCreated = {
        creator_uid: loggedInMemberId,
        op_code: OperationType.GIVE,
        data: {
          to_uid: memberToGiveToId,
          amount: toAmount.toString(),
          memo: transactionMemo,
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
        .update(memberToGiveTo.ref, {
          raha_balance: toBalance.plus(bigAmount).toString()
        })
        .update(donationRecipient.ref, {
          raha_balance: donationRecipientBalance.plus(donationAmount).toString()
        })
        .set(newOperationRef, newOperation);
      return newOperationRef;
    });

    return {
      body: {
        ...(await newOperationReference.get()).data(),
        id: newOperationReference.id
      } as Operation,
      status: 201
    };
  });
