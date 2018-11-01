import {
  InvalidParamsError,
  InvalidParamsDetail
} from "../errors/RahaApiError/InvalidParamsError";
import { Omit } from "../helpers/Omit";

/**
 * Identifiers for kinds of MediaReferences
 */
export enum MediaReferenceKind {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO"
}

/**
 * Common fields available to any MediaReference content field
 */
export interface MediaReferenceContentBase {
  url: string;
}

/**
 * Shape of a reference to type of media
 */
export interface MediaReferenceDefinition<
  Kind extends MediaReferenceKind,
  Content = {}
> {
  /**
   * unique identifier for this media. should remain the same regardless of
   * where the media is hosted (i.e. the url field below)
   */
  id: string;
  kind: Kind;
  content: Content & MediaReferenceContentBase;
}

/**
 * Reference to a video uploaded to Raha
 */
export type VideoReference = MediaReferenceDefinition<
  MediaReferenceKind.VIDEO,
  { thumbnailUrl: string }
>;
export const VIDEO_URL_FIELDS: Array<keyof VideoReference["content"]> = [
  "url",
  "thumbnailUrl"
];

/**
 * Reference to an image uploaded to Raha
 */
export type ImageReference = MediaReferenceDefinition<MediaReferenceKind.IMAGE>;
export const IMAGE_URL_FIELDS: Array<keyof ImageReference["content"]> = ["url"];

/**
 * Shapes of references to external media to be consumed in the Raha app
 */
export type MediaReference = VideoReference | ImageReference;

function _validateMediaReference<Reference extends MediaReference>({
  fieldName,
  mediaReference,
  expectedUrlFields,
  expectedKind
}: {
  fieldName: string;
  mediaReference: Reference;
  expectedUrlFields: Array<keyof Reference["content"]>;
  expectedKind: Reference["kind"];
}) {
  const errors: InvalidParamsDetail[] = [];
  const errorDetailBase: Omit<InvalidParamsDetail, "message"> = {
    name: fieldName
  };
  if (mediaReference.kind !== expectedKind) {
    errors.push({
      ...errorDetailBase,
      message: `Field 'kind' expected to be '${
        MediaReferenceKind.VIDEO
      }'; instead was ${mediaReference.kind}`
    });
  }

  const content: Reference["content"] = mediaReference.content;
  const invalidUrlFields: typeof expectedUrlFields = expectedUrlFields.reduce(
    (memo, field) => {
      const value = content[field];
      if (!value) {
        return [...memo, field];
      }
      return memo;
    },
    [] as typeof expectedUrlFields
  );
  if (invalidUrlFields.length > 0) {
    invalidUrlFields.forEach(field => {
      errors.push({
        ...errorDetailBase,
        message: `Field '${field}' expected to be a valid URL; instead was ${
          content[field]
        }`
      });
    });
  }

  if (errors.length > 0) {
    throw new InvalidParamsError(errors);
  }
}

export function validateMediaReference(
  mediaReference: MediaReference,
  fieldName: string
) {
  switch (mediaReference.kind) {
    default:
      throw new InvalidParamsError([
        {
          name: fieldName,
          message: `Invalid 'kind' field: received ${
            (mediaReference as MediaReference).kind
          }`
        }
      ]);
    case MediaReferenceKind.IMAGE:
      return _validateMediaReference<ImageReference>({
        fieldName,
        mediaReference,
        expectedUrlFields: ["url"],
        expectedKind: MediaReferenceKind.IMAGE
      });
    case MediaReferenceKind.VIDEO:
      return _validateMediaReference<VideoReference>({
        fieldName,
        mediaReference,
        expectedUrlFields: VIDEO_URL_FIELDS,
        expectedKind: MediaReferenceKind.VIDEO
      });
  }
}

/**
 * Validates that a VideoReference is valid.
 *
 * @throws InvalidParamsDetail if not valid.
 */
export function validateVideoReference({
  fieldName,
  videoReference
}: {
  fieldName: string;
  videoReference: VideoReference;
}): void {
  _validateMediaReference<VideoReference>({
    fieldName,
    mediaReference: videoReference,
    expectedUrlFields: VIDEO_URL_FIELDS,
    expectedKind: MediaReferenceKind.VIDEO
  });
}
