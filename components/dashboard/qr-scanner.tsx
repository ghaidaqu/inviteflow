'use client';

import { useEffect, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { useTranslations } from 'next-intl';
import { checkInTicketAction } from '@/lib/actions/checkin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const SCANNER_ELEMENT_ID = 'qr-reader';
const RESCAN_COOLDOWN_MS = 2000;

type ScanEntry = {
  id: number;
  result: 'valid' | 'already_used' | 'cancelled' | 'not_found' | 'error';
  holderName?: string;
};

const RESULT_VARIANT = {
  valid: 'default',
  already_used: 'secondary',
  cancelled: 'destructive',
  not_found: 'destructive',
  error: 'destructive',
} as const;

export function QrScanner() {
  const t = useTranslations('CheckIn');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanEntry | null>(null);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [manualToken, setManualToken] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const nextIdRef = useRef(0);

  async function handleDecoded(token: string) {
    if (processingRef.current || !token) return;
    processingRef.current = true;

    const res = await checkInTicketAction(token);
    const entry: ScanEntry =
      'error' in res
        ? { id: nextIdRef.current++, result: 'error' }
        : { id: nextIdRef.current++, result: res.result, holderName: res.holderName };

    setLastScan(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 10));

    setTimeout(() => {
      processingRef.current = false;
    }, RESCAN_COOLDOWN_MS);
  }

  useEffect(() => {
    let cancelled = false;

    // html5-qrcode is ~110KB and only ever runs here, behind a camera
    // permission prompt. Importing it lazily keeps it out of the check-in
    // page's initial bundle — the manual-entry fallback below stays usable
    // while it loads, and on a device with no camera it never loads at all.
    void import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            void handleDecoded(decodedText);
          },
          () => {},
        )
        .catch(() => setCameraError('cameraUnavailable'));
    });

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      if (current) {
        current
          .stop()
          .catch(() => {})
          .finally(() => current.clear());
      }
    };
  }, []);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = manualToken.trim();
    if (token) {
      void handleDecoded(token);
      setManualToken('');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card overflow-hidden rounded-xl border">
        <div id={SCANNER_ELEMENT_ID} className="mx-auto max-w-sm" />
      </div>

      {cameraError && (
        <Alert variant="destructive">
          <AlertDescription>{t('cameraUnavailable')}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          placeholder={t('manualTokenPlaceholder')}
        />
        <Button type="submit" variant="outline">
          {t('manualSubmit')}
        </Button>
      </form>

      {lastScan && (
        <div className="bg-card rounded-xl border p-5 text-center">
          <Badge variant={RESULT_VARIANT[lastScan.result]} className="text-sm">
            {t(`results.${lastScan.result}`)}
          </Badge>
          {lastScan.holderName && <p className="mt-2 font-medium">{lastScan.holderName}</p>}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('recentScans')}</h3>
          <ul className="flex flex-col gap-1">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{entry.holderName ?? '—'}</span>
                <Badge variant={RESULT_VARIANT[entry.result]}>{t(`results.${entry.result}`)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
