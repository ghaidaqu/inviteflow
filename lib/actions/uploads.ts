'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';

export type UploadCoverImageState = {
  error?: string;
  url?: string;
  isVideo?: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Deliberately permissive rather than an explicit format allowlist:
// rejecting a phone's own recording because its exact codec/container
// wasn't on a hand-picked list ("مو مدعوم") was worse than accepting
// anything the browser itself reports as a video and letting playback
// compatibility on the guest-facing page be a separate, later concern —
// better an organizer's video is there and occasionally doesn't play on
// one odd browser than it never uploads at all. mp4/webm/quicktime still
// get their own clean extension below; anything else falls back to its
// own MIME subtype as the extension.
function isVideoType(type: string): boolean {
  return type.startsWith('video/');
}

/**
 * Uploads through the service-role client (bypasses storage RLS) rather
 * than requiring a whole separate set of `storage.objects` policies —
 * authorization for a signed-in user happens here instead. The random
 * filename means one organizer can't guess or overwrite another's file.
 * The bucket itself is public so the resulting URL works on the
 * guest-facing invitation page with no auth.
 *
 * Also callable while signed out — the /start quick-start flow needs a
 * real cover image before the account exists. Anonymous uploads are
 * image-only (no video) and keyed by IP with a tighter limit, since IP
 * is a weaker identity than a user id and this is the one write path in
 * the app that accepts a file from someone we've never authenticated.
 */
export async function uploadCoverImageAction(
  _prevState: UploadCoverImageState,
  formData: FormData,
): Promise<UploadCoverImageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rateLimitScope = user ? user.id : `anon:${await getClientIp()}`;
  const allowed = await checkRateLimit(supabase, {
    action: 'cover-upload',
    scope: rateLimitScope,
    maxHits: user ? 20 : 5,
    windowSeconds: 600,
  });
  if (!allowed) return { error: 'rateLimited' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'invalidInput' };
  const isVideo = isVideoType(file.type);
  // Signed-in organizers can upload any video the browser itself
  // recognizes as one (see isVideoType above); anonymous /start uploads
  // stay image-only regardless — an anonymous upload always has to match
  // the plain IMAGE_TYPES list exactly.
  const validType = IMAGE_TYPES.includes(file.type) || (user && isVideo);
  if (!validType) return { error: 'invalidFileType' };
  if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return { error: 'fileTooLarge' };

  const EXT_BY_TYPE: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  // Falls back to the MIME subtype itself (e.g. "video/x-matroska" → "x-
  // matroska") for a video format outside the known list above, rather
  // than a meaningless ".bin" — sanitized since a MIME subtype can
  // contain characters ("+", ";") a real filename shouldn't.
  const ext =
    EXT_BY_TYPE[file.type] ?? file.type.split('/')[1]?.replace(/[^a-z0-9-]/gi, '') ?? 'bin';
  const path = `${user ? user.id : 'anon'}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('event-covers')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { error: 'uploadFailed' };

  const {
    data: { publicUrl },
  } = admin.storage.from('event-covers').getPublicUrl(path);

  return { url: publicUrl, isVideo };
}
