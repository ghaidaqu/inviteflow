import { createClient } from '@supabase/supabase-js';
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const r = await a.from('whatsapp_deliveries')
  .select('message_id,kind,status,error_code,error_detail,created_at,guest_id')
  .order('created_at', { ascending: false }).limit(25);
console.log('delivery rows:', r.data?.length ?? 0, r.error?.message ?? '');
for (const d of (r.data ?? []) as Record<string, unknown>[]) {
  console.log(` ${String(d.created_at).slice(0,19)} ${String(d.kind).padEnd(11)} ${String(d.status).padEnd(10)} ${d.error_code ?? ''} ${d.error_detail ?? ''}`);
}
