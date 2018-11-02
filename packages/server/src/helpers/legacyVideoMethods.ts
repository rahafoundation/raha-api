import * as Storage from "@google-cloud/storage";
import { storage as adminStorage } from "firebase-admin";
import * as httpStatus from "http-status";

import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";

import { Config } from "../config/prod.config";

export type BucketStorage = adminStorage.Storage | Storage.Storage;

export function getPublicInviteVideoRef(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(`${uid}/invite.mp4`);
}

export function getPublicInviteVideoThumbnailRef(
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
  const publicVideoRef = getPublicInviteVideoRef(config, storage, memberUid);
  const publicThumbnailRef = getPublicInviteVideoThumbnailRef(
    config,
    storage,
    memberUid
  );

  if (
    (await Promise.all([
      publicVideoRef.exists(),
      publicThumbnailRef.exists()
    ])).find(x => x[0])
  ) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  const privateVideoRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${videoToken}/video.mp4`);

  const privateThumbnailRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`private-video/${videoToken}/thumbnail.jpg`);

  if (!(await privateVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Private video does not exist at expected location. Cannot move.",
      {}
    );
  }

  await (removeOriginal
    ? privateVideoRef.move(publicVideoRef)
    : privateVideoRef.copy(publicVideoRef));

  // Until the iOS app gets updated and starts generating thumbnails, we
  // cannot throw an error on the thumbnail not existing.
  // TODO: Throw an error on non-existent thumbnail once the iOS app gets updated.
  if ((await privateThumbnailRef.exists())[0]) {
    await (removeOriginal
      ? privateThumbnailRef.move(publicThumbnailRef)
      : privateThumbnailRef.copy(publicThumbnailRef));
  }

  return publicVideoRef;
}
