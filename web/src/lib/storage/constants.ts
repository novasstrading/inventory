export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB, matches legacy limit
export const ALLOWED_PHOTO_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
export const ALLOWED_DOC_EXT = ["pdf", "jpg", "jpeg", "png", "webp", "gif"];

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};
