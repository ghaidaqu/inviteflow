'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';

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
 * authorization happens here instead: only a signed-in user can call this
 * at all, and the random filename means one organizer can't guess or
 * overwrite another's file. The bucket itself is public so the resulting
 * URL works on the guest-facing invitation page with no auth.
 */
export async function uploadCoverImageAction(
  _prevState: UploadCoverImageState,
  formData: FormData,
): Promise<UploadCoverImageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  // Being signed in isn't enough of a guard on its own here: a video can be
  // 50MB, so an account looping this call could run up real storage cost
  // fast. Keyed on the user id (not just IP) so one account can't dodge the
  // limit by switching networks.
  const allowed = await checkRateLimit(supabase, {
    action: 'cover-upload',
    scope: user.id,
    maxHits: 20,
    windowSeconds: 600,
  });
  if (!allowed) return { error: 'rateLimited' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'invalidInput' };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'invalidFileType' };
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
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

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
