// Cover uploads accept any image the app itself produces (a short, fixed
// list — see IMAGE_TYPES in lib/actions/uploads.ts) or any `video/*` MIME
// type the browser reports, so a saved cover URL's extension can be
// "png"/"jpg"/"webp"/"gif" for an image, or genuinely anything else for
// a video (not just "mp4"/"webm"/"mov" — a phone recording can land as
// "3gpp", "x-matroska", "quicktime", etc., see uploads.ts's own fallback
// extension logic). So this checks for a known IMAGE extension and
// treats everything else as video, rather than keeping an allowlist of
// video extensions that inevitably misses a real one — used everywhere a
// saved cover URL (a plain string) needs to render as `<video>` vs
// `<img>` with no other metadata to go on.
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}
