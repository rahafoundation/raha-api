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

/**
 * Reference to an image uploaded to Raha
 */
export type ImageReference = MediaReferenceDefinition<MediaReferenceKind.IMAGE>;

/**
 * Shapes of references to external media to be consumed in the Raha app
 */
export type MediaReference = VideoReference | ImageReference;
