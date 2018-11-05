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

const REFERENCE_ID_DIRNAME = "byReferenceId";

// TODO: LEGACY [explicit-video-refs] once legacy stuff isn't required, move
// this helper to a file not associated with legacy things
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
  await movePrivateInviteVideoToPublicBucket({
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
 * Get videos by video reference ID
 */
export function videoPaths(
  videoReferenceId: string
): { video: string; thumbnail: string } {
  return {
    video: `${REFERENCE_ID_DIRNAME}/${videoReferenceId}/video.mp4`,
    thumbnail: `${REFERENCE_ID_DIRNAME}/${videoReferenceId}/thumbnail.jpg`
  };
}
/**
 * Invites thrown into a public bucket
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

/**
 * For migration from legacy in sendInvite and migration scripts.
 *
 * Invite videos used to be stored in a private bucket, addressed by a "video
 * token" selected by the client app, which in turn was saved as the
 * inviteToken. Now, we will generate a separate videoReferenceId, copy the
 * private video to that location, and refer to that new public video in a
 * videoReference object on the new invite operation.
 */
export async function movePrivateInviteVideoToPublicBucket({
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
): Promise<void> {
  const publicVideoRefs = {
    video: getPublicInviteVideoRefForMember(config, storage, memberUid),
    thumbnail: getPublicInviteVideoThumbnailRefForMember(
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

export function getPublicUrlForPath(config: Config, path: string): string {
  return `https://storage.googleapis.com/${config.publicVideoBucket}/${path}`;
}

export function getPublicUrlForMemberAndToken(
  config: Config,
  memberUid: string,
  videoToken: string
): string {
  return getPublicUrlForPath(config, `${memberUid}/${videoToken}/video.mp4`);
}
