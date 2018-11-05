/**
 * LEGACY [explicit-video-refs]
 * Helpers to migrate from implicit inferred videos to explicit video
 * references. Involves copying videos from their old locations to new ones, and
 * returning data structures necessary for storing the new structure of video
 * references for the following API methods:
 *
 * - sendInvite
 * - createMember
 * - verifyMember
 *
 * These are the following locations referenced by legacy clients:
 *
 * - the client always uploads all videos—invite videos or new user videos—to a
 *   bucket only logged in users can see ("auth-restricted"), addressed by a
 *   client-generated videoToken.
 * - member video locations are always expected to be in the public video
 *   bucket, at {memberId}/invite.mp4. These can be joint invite videos
 *   including the user, or a video of themselves introducing themselves.
 * - When an existing member verifies a new member, they either create a new
 *   auth-restricted video verifying the member, or if they are the inviter,
 *   they use their own previous (auth-restricted) invite video to make sure
 *   it looks right.
 *   - Then, that video gets copied to the verifier's list of verification
 *     videos, at {memberId}/{videoToken}/video.mp4.
 * - all these videos are expected to have thumbnails at <url>.thumb.jpg
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

// -----------------
// utility functions
// -----------------
// These are likely to remain useful after legacy support is dropped. for legacy
// functions, see the section below, where functions are prepended by LEGACY_ or
// LEGACY_COMPAT titles.

/**
 * Dirname of the default location videos are placed in the public bucket by the
 * API.
 *
 * VideoReferences may have videos located elsewhere (they're arbitrary URLs),
 * so not reliable as a way to derive Google Cloud Storage references to a
 * public video.
 */
const VIDEOS_DEFAULT_DIRNAME = "videosByReferenceId";

/**
 * Get reference to the storage bucket for public videos.
 */
export function getPublicVideoBucketRef(
  config: Config,
  storage: BucketStorage
) {
  return (storage as Storage.Storage).bucket(config.publicVideoBucket);
}

/**
 * Get the public url for a file stored in Google Cloud Storage
 */
export function getCloudStorageUrlForPath(
  publicVideoBucket: string,
  path: string
): string {
  return `https://storage.googleapis.com/${publicVideoBucket}/${path}`;
}

/**
 * Create a VideoReference from its content, generating a unique ID for it.
 *
 * Expects videos to already be hosted somewhere, so ID is not a reliable way to
 * determine Google Cloud Storage references to the videos.
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
 * Get relative paths to where a video with a given reference ID should be
 * stored by default in Raha Google Cloud Storage.
 */
function newDefaultVideoPathsForReferenceId(
  videoReferenceId: string
): { video: string; thumbnail: string } {
  return {
    video: `${VIDEOS_DEFAULT_DIRNAME}/${videoReferenceId}/video.mp4`,
    thumbnail: `${VIDEOS_DEFAULT_DIRNAME}/${videoReferenceId}/thumbnail.jpg`
  };
}

/**
 * Get a Storage reference to a video stored publically (by reference id).
 */
export function getDestinationRefForNewPublicVideo(
  config: Config,
  storage: BucketStorage,
  videoReferenceId: string
): { video: Storage.File; thumbnail: Storage.File } {
  const paths = newDefaultVideoPathsForReferenceId(videoReferenceId);
  return {
    video: getPublicVideoBucketRef(config, storage).file(paths.video),
    thumbnail: getPublicVideoBucketRef(config, storage).file(paths.thumbnail)
  };
}

/**
 * Move a video from one storage ref to another.
 * @param removeOriginal [boolean] copy if false, move if true.
 */
export async function moveVideoWithinCloudStorage(
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
      "Auth-restricted video does not exist at expected location. Cannot move.",
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

// ------------------------------
// Legacy compatibility functions
// ------------------------------

/**
 * Legacy compatibility function to copy auth-restricted invite videos to new,
 * public non-legacy locations, and return a new-style video reference pointing
 * to the new public, referenceId-addressed video location.
 */
export async function LEGACY_COMPAT_createVideoReferenceForAuthRestrictedVideo({
  config,
  storage,
  videoData
}: {
  config: Config;
  storage: BucketStorage;
  videoData:
    | { videoReference: VideoReference["content"] }
    | { videoToken: string };
}): Promise<VideoReference> {
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
  await LEGACY_COMPAT_moveAuthRestrictedVideoToNewPublicVideoReference({
    config,
    storage,
    newVideoReferenceId,
    authRestrictedVideoToken: videoData.videoToken,
    removeOriginal: false
  });

  const paths = newDefaultVideoPathsForReferenceId(newVideoReferenceId);

  return {
    id: newVideoReferenceId,
    content: {
      kind: MediaReferenceKind.VIDEO,
      url: getCloudStorageUrlForPath(config.publicVideoBucket, paths.video),
      thumbnailUrl: getCloudStorageUrlForPath(
        config.publicVideoBucket,
        paths.thumbnail
      )
    }
  };
}

/**
 * Legacy getter for a member's identity video at canonical location based on a
 * member's Id, instead of the new videoReference ids. It's named `invite.mp4`,
 * but you'll have one even if you're not invited.
 */
function LEGACY_getPublicIdentityVideoRefForMember(
  config: Config,
  storage: BucketStorage,
  memberId: string
): { video: Storage.File; thumbnail: Storage.File } {
  return {
    video: getPublicVideoBucketRef(config, storage).file(
      `${memberId}/invite.mp4`
    ),
    thumbnail: getPublicVideoBucketRef(config, storage).file(
      `${memberId}/invite.mp4.thumb.jpg`
    )
  };
}

export function LEGACY_getPublicInviteVideoUrlForMember(
  config: Config,
  memberId: string
): string {
  return `https://storage.googleapis.com/${
    config.publicVideoBucket
  }/${memberId}/invite.mp4`;
}

/**
 * Legacy compatibility function that moves a video from the legacy
 * auth-restricted invite video bucket to the new, global public vidoeReference
 * bucket. Necessary when old clients that store videos in the legacy locations
 * send an invite, so that new clients that expect it from the videoReference
 * bucket will be able to access it.
 *
 * Invite videos used to be stored in a auth-restricted bucket, addressed by a
 * "video token" selected by the client app, which in turn was saved as the
 * inviteToken. Now, we will generate a separate videoReferenceId, copy the
 * auth-restricted video to that location, and refer to that new public video in
 * a videoReference object on the new invite operation.
 */
async function LEGACY_COMPAT_moveAuthRestrictedVideoToNewPublicVideoReference({
  config,
  storage,
  newVideoReferenceId,
  authRestrictedVideoToken,
  removeOriginal
}: {
  config: Config;
  storage: BucketStorage;
  newVideoReferenceId: string;
  authRestrictedVideoToken: string;
  removeOriginal: boolean;
}): Promise<void> {
  const targetVideoRefs = getDestinationRefForNewPublicVideo(
    config,
    storage,
    newVideoReferenceId
  );
  const authRestrictedVideoRefs = {
    video: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${authRestrictedVideoToken}/video.mp4`),

    thumbnail: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${authRestrictedVideoToken}/thumbnail.jpg`)
  };

  return moveVideoWithinCloudStorage(
    targetVideoRefs,
    authRestrictedVideoRefs,
    removeOriginal
  );
}

/**
 * Legacy function that moves a video from the legacy auth-restricted invite video
 * bucket to the public video bucket, at a legacy per-member location. Only one
 * such video can exist.
 *
 * Expects the video to be at /private-video/<videoToken>/video.mp4.
 * Video is moved to /<publicBucket>/<memberId>/invite.mp4.
 *
 * NOTE: the name of the file is invite, even if the user wasn't invited and
 * just joined by uploading a video of themselves
 */
async function LEGACY_moveAuthRestrictedVideoToPublicIdentityVideo(
  config: Config,
  storage: BucketStorage,
  memberId: string,
  videoToken: string,
  removeOriginal: boolean
): Promise<void> {
  const publicVideoRefs = LEGACY_getPublicIdentityVideoRefForMember(
    config,
    storage,
    memberId
  );

  const authRestrictedVideoRefs = {
    video: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${videoToken}/video.mp4`),

    thumbnail: (storage as Storage.Storage)
      .bucket(config.privateVideoBucket)
      .file(`private-video/${videoToken}/thumbnail.jpg`)
  };

  await moveVideoWithinCloudStorage(
    publicVideoRefs,
    authRestrictedVideoRefs,
    removeOriginal
  );
}

/**
 * Legacy function to get the invite URL corresponding to a member, addressed by
 * their user ID and a video token.
 */
export function LEGACY_getPublicIdentityVideoUrlForMemberAndToken(
  config: Config,
  memberId: string,
  videoToken: string
): string {
  return getCloudStorageUrlForPath(
    config.publicVideoBucket,
    `${memberId}/${videoToken}/video.mp4`
  );
}

/**
 * Legacy function that moves a auth-restricted invite video to the public bucket,
 * into the specified member's combined invite/verification video folder. Many
 * of these can exist.
 *
 * Video is moved to /<publicBucket>/<memberId>/<videoToken>/video.mp4.
 */
export async function LEGACY_moveAuthRestrictedVideoToPublicMemberInviteVideoFolder(
  config: Config,
  storage: BucketStorage,
  memberId: string,
  videoToken: string,
  removeOriginal: boolean
) {
  const newVideoPath = `${memberId}/${videoToken}/video.mp4`;
  const publicVideoBucket = (storage as Storage.Storage).bucket(
    config.publicVideoBucket
  );
  const publicVideoRef = publicVideoBucket.file(newVideoPath);
  const publicThumbnailRef = publicVideoBucket.file(
    `${newVideoPath}.thumb.jpg`
  );

  if ((await publicVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Video already exists at intended storage destination. Cannot overwrite.",
      {}
    );
  }

  const authRestrictedVideoPath = `private-video/${videoToken}`;
  const authRestrictedVideoBucket = (storage as Storage.Storage).bucket(
    config.privateVideoBucket
  );
  const authRestrictedVideoRef = authRestrictedVideoBucket.file(
    `${authRestrictedVideoPath}/video.mp4`
  );
  const authRestrictedVideoThumbnailRef = (storage as Storage.Storage)
    .bucket(config.privateVideoBucket)
    .file(`${authRestrictedVideoPath}/thumbnail.jpg`);

  if (!(await authRestrictedVideoRef.exists())[0]) {
    throw new HttpApiError(
      httpStatus.BAD_REQUEST,
      "Private video does not exist at expected location. Cannot move.",
      {}
    );
  }

  await (removeOriginal
    ? authRestrictedVideoRef.move(publicVideoRef)
    : authRestrictedVideoRef.copy(publicVideoRef));

  // Until the iOS app gets updated and starts generating thumbnails, we
  // cannot throw an error on the thumbnail not existing.
  // TODO: Throw an error on non-existent thumbnail once the iOS app gets updated.
  if ((await authRestrictedVideoThumbnailRef.exists())[0]) {
    await (removeOriginal
      ? authRestrictedVideoThumbnailRef.move(publicThumbnailRef)
      : authRestrictedVideoThumbnailRef.copy(publicThumbnailRef));
  }

  return publicVideoRef;
}

/**
 * Paths that can be used to find refs to the videoReference content, if they
 * are stored in Google Cloud Storage. Helpful for now to simplify handling of
 * legacy compatibility methods.
 *
 * @returns undefined if not in cloud storage or not a video
 *
 */
export function LEGACY_COMPAT_refsForVideoReferenceInCloudStorage(
  config: Config,
  storage: BucketStorage,
  videoReference: VideoReference
): { video: Storage.File; thumbnail: Storage.File } | undefined {
  if (videoReference.content.kind !== MediaReferenceKind.VIDEO) {
    return undefined;
  }
  const { url, thumbnailUrl } = videoReference.content;
  const urlPrefix = getCloudStorageUrlForPath(config.publicVideoBucket, "");
  if (!url.startsWith(urlPrefix) || !thumbnailUrl.startsWith(urlPrefix)) {
    return undefined;
  }
  const paths = {
    video: url.substr(urlPrefix.length),
    thumbnail: url.substr(urlPrefix.length)
  };
  return {
    video: getPublicVideoBucketRef(config, storage).file(paths.video),
    thumbnail: getPublicVideoBucketRef(config, storage).file(paths.thumbnail)
  };
}

/**
 * Legacy compatibility function create a video at the legacy public location
 * for identity videos at <memberId>/invite.mp4
 *
 * Expects an already stored videoReference, not just its content
 */
export async function LEGACY_COMPAT_createLegacyIdentityVideoFromVideoReference({
  config,
  storage,
  memberId,
  videoReference
}: {
  config: Config;
  storage: BucketStorage;
  memberId: string;
  videoReference: VideoReference;
}): Promise<void> {
  const sourceVideoRefs = LEGACY_COMPAT_refsForVideoReferenceInCloudStorage(
    config,
    storage,
    videoReference
  );
  if (!sourceVideoRefs) {
    // Since we're the only people uploading videos at the moment, this
    // shouldn't occur; hopefully we'll be getting rid of legacy compatibility
    // functions soon so this will be removable in due time.
    throw new Error(
      "Legacy compatibility methods don't support video references that are not stored in Raha's cloud storage systems."
    );
  }

  const targetVideoRefs = LEGACY_getPublicIdentityVideoRefForMember(
    config,
    storage,
    memberId
  );
  moveVideoWithinCloudStorage(targetVideoRefs, sourceVideoRefs, false);
}
