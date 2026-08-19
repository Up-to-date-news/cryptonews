const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;
  const [, mime, base64] = match;
  const ext = MIME_TO_EXT[mime];
  if (!ext) return null;
  return { mime, ext, base64 };
}
