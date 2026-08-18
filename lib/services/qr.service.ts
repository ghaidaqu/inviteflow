import 'server-only';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Generates a PNG QR code and uploads it to the same public bucket cover
 * images already use (under a qr/ prefix) rather than provisioning a
 * dedicated bucket — it's already public and already proven to work.
 * Returns the public URL, or null on any failure. Best-effort by design:
 * every caller treats a failed QR as "the RSVP still succeeded, just
 * couldn't attach a QR this time" rather than something to fail loudly on.
 */
export async function generateAndUploadQr(key: string, content: string): Promise<string | null> {
  try {
    const buffer = await QRCode.toBuffer(content, { margin: 1, width: 512 });
    const admin = createAdminClient();
    const path = `qr/${key}.png`;
    const { error } = await admin.storage
      .from('event-covers')
      .upload(path, buffer, { contentType: 'image/png', upsert: true });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = admin.storage.from('event-covers').getPublicUrl(path);
    return publicUrl;
  } catch (error) {
    console.error('[qr] generate/upload failed', error);
    return null;
  }
}
