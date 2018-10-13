/**
 * Reference to a video uploaded to Raha.
 */
export interface VideoReference {
  /**
   * unique identifier for this video. should remain the same regardless of
   * where a video is hosted (as in the URL fields below)
   */
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
}
