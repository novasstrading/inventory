export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024);
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
