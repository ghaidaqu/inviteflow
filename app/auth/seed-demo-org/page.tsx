'use client';

import { useState } from 'react';
import { seedDemoOrgAction } from '@/lib/actions/one-time-seed-demo-org';

// TEMPORARY, one-time-use page — see lib/actions/one-time-seed-demo-org.ts
// for why this exists, and why it lives under /auth specifically (next-
// intl's routing middleware excludes that prefix from its locale-prefix
// redirect, the same reason app/auth/logout lives outside /[locale]).
// Not linked from anywhere in the real app. Delete this file and that
// action once this has succeeded once.
export default function AdminSeedDemoOrgPage() {
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', direction: 'ltr' }}>
      <h1>One-time: seed mahalli-demo organization</h1>
      <input
        type="password"
        placeholder="ADMIN_SEED_SECRET"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        style={{ padding: 8, width: 400, marginInlineEnd: 8 }}
      />
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setResult(null);
          const r = await seedDemoOrgAction(secret);
          setResult(JSON.stringify(r, null, 2));
          setPending(false);
        }}
        style={{ padding: '8px 16px' }}
      >
        {pending ? 'Running...' : 'Run'}
      </button>
      {result && <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap' }}>{result}</pre>}
    </div>
  );
}
