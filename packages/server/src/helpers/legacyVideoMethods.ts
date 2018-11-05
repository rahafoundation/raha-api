/**
 * LEGACY [explicit-video-refs]
 * Helpers to migrate from implicit inferred videos to explicit video
 * references. Involves copying videos from their old locations to new ones, and
 * returning data structures necessary for storing the new structure of video
 * references for the following methods:
 *
 * - sendInvite
 * - createMember
 * - verifyMember
 */
import * as Storage from "@google-cloud/storage";
import { storage as adminStorage } from "firebase-admin";
import * as httpStatus from "http-status";

import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";

import { Config } from "../config/prod.config";
import {
  MediaReferenceKind,
  VideoReference
} from "@raha/api-shared/dist/models/MediaReference";
import { generateId } from "./id";

export type BucketStorage = adminStorage.Storage | Storage.Storage;

// ---------------
// utility methods
// ---------------
// These are likely to remain useful after legacy support is dropped. for legacy
// methods, see the section below, where functions are prepended by LEGACY_ or
// LEGACY_COMPAT titles.

const VIDEOS_DIRNAME = "videosById";

/**
 * Get the public url for a file stored in Google Cloud Storage
 */
export function getPublicUrlForPath(config: Config, path: string): string {
  return `https://storage.googleapis.com/${config.publicVideoBucket}/${path}`;
}

/**
 * Create a VideoReference from its content, generating a unique ID for it
 */
function createVideoReference(
  content: VideoReference["content"]
): VideoReference {
  return {
    id: generateId(),
    content
  };
}

/**
 * Get relative paths to a publically-stored video in a bucket (by reference
 * id).
 */
function videoPaths(
  videoReferenceId: string
): { video: string; thumbnail: string } {
  return {
    video: `${VIDEOS_DIRNAME}/${videoReferenceId}/video.mp4`,
    thumbnail: `${VIDEOS_DIRNAME}/${videoReferenceId}/thumbnail.jpg`
  };
}

/**
 * Get a Storage reference to a video stored publically (by reference id).
 */
export function getPublicVideoRef(
  config: Config,
  storage: BucketStorage,
  videoReferenceId: string
): { video: Storage.File; thumbnail: Storage.File } {
  const paths = videoPaths(videoReferenceId);
  return {
    video: getPublicVideoBucketRef(config, storage).file(paths.video),
    thumbnail: getPublicVideoBucketRef(config, storage).file(paths.thumbnail)
  };
}

/**
 * Move a video from one storage ref to another.
 * @param removeOriginal [boolean] copy if false, move if true.
 */
export async function moveVideo(
  targetVideoRefs: { video: Storage.File; thumbnail: Storage.File },
  sourceVideoRefs: { video: Storage.File; thumbnail: Storage.File },
  removeOriginal: boolean
): Promise<void> {
  if (
    (await Promise.all([
      targetVideoRefs.video.exists(),
      targetVideoRefs.thumbnail.exists()
    ])).find(x => x[0])
  ) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  // we don't enforce thumbnail being present
  if (!(await sourceVideoRefs.video.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Private video does not exist at expected location. Cannot move.",
      {}
    );
  }

  await (removeOriginal
    ? sourceVideoRefs.video.move(targetVideoRefs.video)
    : sourceVideoRefs.video.copy(targetVideoRefs.video));

  // Until the iOS app gets updated and starts generating thumbnails, we
  // cannot throw an error on the thumbnail not existing.
  // TODO: Throw an error on non-existent thumbnail once the iOS app gets updated.
  if ((await sourceVideoRefs.thumbnail.exists())[0]) {
    await (removeOriginal
      ? sourceVideoRefs.thumbnail.move(targetVideoRefs.thumbnail)
      : sourceVideoRefs.thumbnail.copy(targetVideoRefs.thumbnail));
  }
}

// ----------------------------
// Legacy compatibility methods
// ----------------------------

/**
 * Legacy compatibility method to copy private invite videos to new non-legacy
 * locations, and return a new-style video reference pointing to the new public,
 * referenceId-addressed video location.
 */
export async function LEGACY_createVideoReferenceForInviteVideo(
  config: Config,
  storage: BucketStorage,
  videoData:
    | { videoReference: VideoReference["content"] }
    | { videoToken: string }
): Promise<VideoReference> {
  if ("videoReference" in videoData) {
    // technically, this breaks backwards compatibility since we're not copying
    // the new video location to the old one; but the only people who would
    // experience this is people who are joining Raha but already somehow have
    // an outdated version of the app installed. Pretty unlikely, so not
    // worrying about copying the video over; failure case is that the invite
    // video doesn't show up when signing up.
    return createVideoReference(videoData.videoReference);
  }

  // then we will see if this is a legacy request.

  if (!("videoToken" in videoData) || !videoData.videoToken) {
    throw new Error(
      "Unexpected: could not retrieve video reference from send invite API call."
    );
  }

  const newVideoReferenceId = generateId();

  // we assume this is a legacy request. Copy the legacy video to the new
  // video reference location
  await LEGACY_COMPAT_movePrivateInviteVideoToNewPublicVideoReferencesBucket({
    config,
    storage,
    newVideoReferenceId,
    privateVideoToken: videoData.videoToken,
    removeOriginal: false
  });

  const paths = videoPaths(newVideoReferenceId);

  return {
    id: newVideoReferenceId,
    content: {
      kind: MediaReferenceKind.VIDEO,
      url: getPublicUrlForPath(config, paths.video),
      thumbnailUrl: getPublicUrlForPath(config, paths.thumbnail)
    }
  };
}

/**
 * Legacy getter for invite videos at canonical location based on a member's
 * uid, instead of the new videoReference ids.
 */
function LEGACY_getPublicInviteVideoRefForMember(
  config: Config,
  storage: BucketStorage,
  uid: string
): Storage.File {
  return getPublicVideoBucketRef(config, storage).file(`${uid}/invite.mp4`);
}

/**
 * Legacy getter for invite videos' thumbnails at canonical location based on a
 * member's uid, instead of the new videoReference ids.
 */
function LEGACY_getPublicInviteVideoThumbnailRefForMember(
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
  memberId: string
): string {
  return `https://storage.googleapis.com/${
    config.publicVideoBucket
  }/${memberId}/invite.mp4`;
}

export function getPublicVideoBucketRef(
  config: Config,
  storage: BucketStorage
) {
  return (storage as Storage.Storage).bucket(config.publicVideoBucket);
}

/**
 * Legacy compatibility method that moves a video from the legacy private invite
 * video bucket to the new, global public vidoeReference bucket. Necessary when
 * old clients that store videos in the legacy locations send an invite, so that
 * new clients that expect it from the videoReference bucket will be able to
 * access it.
 *
 * Invite videos used to be stored in a private bucket, addressed by a "video
 * token" selected by the client app, which in turn was saved as the
 * inviteToken. Now, we will generate a separate videoReferenceId, copy the
 * private video to that location, and refer to that new public video in a
 * videoReference object on the new invite operation.
 */
export async function LEGACY_COMPAT_movePrivateInviteVideoToNewPublicVideoReferencesBucket({
  config,
  storage,
  newVideoReferenceId,
  privateVideoToken,
  removeOriginal
}: {
  config: Config;
  storage: BucketStorage;
  newVideoReferenceId: string;
  privateVideoToken: string;
  removeOriginal: boolean;
}): Promise<void> {
  const targetVideoRefs = getPublicVideoRef(
    config,
    storage,
    newVideoReferenceId
  );
  const privateVideoRefs = {
    video: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${privateVideoToken}/video.mp4`),

    thumbnail: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${privateVideoToken}/thumbnail.jpg`)
  };

  return moveVideo(targetVideoRefs, privateVideoRefs, removeOriginal);
}

/**
 * Legacy method that moves a video from the legacy private invite video bucket
 * to the legacy per-member public identity video bucket. This ensures old
 * clients will still be able to access videos where they expect to find them.
 *
 * Expects the video to be at /private-video/<videoToken>/video.mp4.
 * Video is moved to /<publicBucket>/<memberUid>/invite.mp4.
 */
export async function LEGACY_movePrivateInviteVideoToPublicInviteVideo(
  config: Config,
  storage: BucketStorage,
  memberUid: string,
  videoToken: string,
  removeOriginal: boolean
): Promise<void> {
  const publicVideoRefs = {
    video: LEGACY_getPublicInviteVideoRefForMember(config, storage, memberUid),
    thumbnail: LEGACY_getPublicInviteVideoThumbnailRefForMember(
      config,
      storage,
      memberUid
    )
  };

  const privateVideoRefs = {
    video: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${videoToken}/video.mp4`),

    thumbnail: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${videoToken}/thumbnail.jpg`)
  };

  await moveVideo(publicVideoRefs, privateVideoRefs, removeOriginal);
}

/**
 * Legacy method to get the invite URL corresponding to a member, addressed by
 * their user ID and a video token.
 */
export function LEGACY_getPublicIdentityVideoUrlForMemberAndToken(
  config: Config,
  memberUid: string,
  videoToken: string
): string {
  return getPublicUrlForPath(config, `${memberUid}/${videoToken}/video.mp4`);
}
