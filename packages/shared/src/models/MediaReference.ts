export interface MediaReference<AdditionalFields = {}> {
  /**
   * unique identifier for this media. should remain the same regardless of
   * where the media is hosted (i.e. the url field below)
   */
  id: string;
  url: string;
  additionalFields: AdditionalFields;
}

/**
 * Reference to a video uploaded to Raha
 */
export type VideoReference = MediaReference<{ thumbnailUrl: string }>;
/**
 * Reference to an image uploaded to Raha
 */
export type ImageReference = MediaReference;
