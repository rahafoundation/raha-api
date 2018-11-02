import * as Storage from "@google-cloud/storage";
import { storage as adminStorage } from "firebase-admin";
import * as httpStatus from "http-status";

import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";

import { Config } from "../config/prod.config";

export type BucketStorage = adminStorage.Storage | Storage.Storage;

/**
 * Invites thrown into a public bucket
 */
export function getPublicInviteVideoRef(
  config: Config,
  storage: BucketStorage,
  inviteToken: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(
    `invites/${inviteToken}/video.mp4`
  );
}

export function getPublicInviteVideoThumbnailRef(
  config: Config,
  storage: BucketStorage,
  inviteToken: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(
    `invites/${inviteToken}/thumbnail.jpg`
  );
}

/**
 * Legacy getter for invite videos at canonical location based on a member's uid
 *
 * Now video urls will be explicit and public; since the accepting member's UID
 * isn't present when sendInvite occurs (until they accept the invite), we need
 * to use a different identifier to address them—hence the new invite video ref
 * methods.
 */
export function getPublicInviteVideoRefForMember(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(`${uid}/invite.mp4`);
}

/**
 * Legacy getter for invite videos' thumbnails at canonical location based on a
 * member's uid
 *
 * Now video urls will be explicit and public; since the accepting member's UID
 * isn't present when sendInvite occurs (until they accept the invite), we need
 * to use a different identifier to address them—hence the new invite video ref
 * methods.
 */
export function getPublicInviteVideoThumbnailRefForMember(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(
    `${uid}/invite.mp4.thumb.jpg`
  );
}

export function getPublicInviteVideoUrlForMember(
  config: Config,
  memberUid: string
) {
  return `https://storage.googleapis.com/${
    config.publicVideoBucket
  }/${memberUid}/invite.mp4`;
}

export function getPublicVideoBucketRef(
  config: Config,
  storage: BucketStorage
) {
  return (storage as Storage.Storage).bucket(config.publicVideoBucket);
}

export async function moveVideo(
  targetVideoRef: Storage.File,
  targetThumbnailRef: Storage.File,
  sourceVideoRef: Storage.File,
  sourceThumbnailRef: Storage.File,
  removeOriginal: boolean
) {
  if (
    (await Promise.all([
      targetVideoRef.exists(),
      targetThumbnailRef.exists()
    ])).find(x => x[0])
  ) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  // we don't enforce thumbnail being present
  if (!(await sourceVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Private video does not exist at expected location. Cannot move.",
      {}
    );
  }

  await (removeOriginal
    ? sourceVideoRef.move(targetVideoRef)
    : sourceVideoRef.copy(targetVideoRef));

  // Until the iOS app gets updated and starts generating thumbnails, we
  // cannot throw an error on the thumbnail not existing.
  // TODO: Throw an error on non-existent thumbnail once the iOS app gets updated.
  if ((await sourceThumbnailRef.exists())[0]) {
    await (removeOriginal
      ? sourceThumbnailRef.move(targetThumbnailRef)
      : sourceThumbnailRef.copy(targetThumbnailRef));
  }

  return targetVideoRef;
}

/**
 * For migration from legacy in sendInvite and migration scripts
 */
export async function movePrivateInviteVideoToPublicBucket(
  config: Config,
  storage: BucketStorage,
  inviteToken: string,
  privateVideoToken: string,
  removeOriginal: boolean
) {
  const targetVideoRef = getPublicInviteVideoRef(config, storage, inviteToken);
  const targetThumbnailRef = getPublicInviteVideoThumbnailRef(
    config,
    storage,
    inviteToken
  );
  const privateVideoRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${privateVideoToken}/video.mp4`);

  const privateThumbnailRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${privateVideoToken}/thumbnail.jpg`);

  return moveVideo(
    targetVideoRef,
    targetThumbnailRef,
    privateVideoRef,
    privateThumbnailRef,
    removeOriginal
  );
}

/**
 * Expects the video to be at /private-video/<videoToken>/video.mp4.
 * Video is moved to /<publicBucket>/<memberUid>/invite.mp4.
 * TODO: Remove this once all invite videos have been moved to tokenized locations
 * and tokens recorded on operations/members.
 */
export async function movePrivateVideoToPublicInviteVideo(
  config: Config,
  storage: BucketStorage,
  memberUid: string,
  videoToken: string,
  removeOriginal: boolean
) {
  const publicVideoRef = getPublicInviteVideoRefForMember(
    config,
    storage,
    memberUid
  );
  const publicThumbnailRef = getPublicInviteVideoThumbnailRefForMember(
    config,
    storage,
    memberUid
  );

  const privateVideoRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${videoToken}/video.mp4`);

  const privateThumbnailRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${videoToken}/thumbnail.jpg`);

  return moveVideo(
    publicVideoRef,
    publicThumbnailRef,
    privateVideoRef,
    privateThumbnailRef,
    removeOriginal
  );
}
