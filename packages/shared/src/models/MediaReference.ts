export interface MediaReferenceDefinition<Content> {
  id: string;
  content: Content & { url: string };
}

export enum MediaReferenceKind {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO"
}

export interface MediaReferenceContent<Kind extends MediaReferenceKind> {
  kind: Kind;
  url: string;
}

export interface VideoReferenceContent
  extends MediaReferenceContent<MediaReferenceKind.VIDEO> {
  thumbnailUrl: string;
}
export type VideoReference = MediaReferenceDefinition<VideoReferenceContent>;

export type ImageReferenceContent = MediaReferenceContent<
  MediaReferenceKind.IMAGE
>;
export type ImageReference = MediaReferenceDefinition<ImageReferenceContent>;

export type MediaReference = ImageReference | VideoReference;
