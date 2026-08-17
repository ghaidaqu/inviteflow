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
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

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
  const allowedTypes = user ? ALLOWED_TYPES : IMAGE_TYPES;
  if (!allowedTypes.includes(file.type)) return { error: 'invalidFileType' };
  const isVideo = VIDEO_TYPES.includes(file.type);
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
  const ext = EXT_BY_TYPE[file.type] ?? 'bin';
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
