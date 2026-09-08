'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useLocale, useTranslations } from 'next-intl';
import { checkInGuestAction, type CheckInActionState } from '@/lib/actions/check-in';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2Icon, XCircleIcon, CameraOffIcon } from 'lucide-react';

type ScanResult = CheckInActionState & { at: number };

/**
 * Reads the device camera directly in the browser rather than any native
 * barcode API (none is universally available across mobile Safari/Chrome
 * yet) — a hidden <canvas> grabs each video frame as pixel data and jsQR
 * (pure JS, no native/WASM dependency) decodes it client-side. Nothing
 * ever leaves the device except the decoded text, sent to
 * checkInGuestAction over the same connection as everything else in the
 * dashboard.
 *
 * One core loop via requestAnimationFrame: draw the current frame, ask
 * jsQR for a code, and if one decodes AND it's different from the last
 * decode (guards against re-firing the same action every frame while the
 * card sits in view), submit it. A short cooldown after each submit
 * avoids a rapid double-scan of the same code before the guest moves
 * their card away.
 */
export function GuestCheckInScanner({
  eventId,
  scan,
}: {
  eventId: string;
  /** How a decoded code gets checked in. Defaults to the organizer's own
   *  (authenticated) action; the public door-staff page passes one bound
   *  to its link token instead, so the same camera loop serves both
   *  without either knowing about the other's auth model. */
  scan?: (scannedText: string) => Promise<CheckInActionState>;
}) {
  const t = useTranslations('CheckIn');
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ text: string; at: number } | null>(null);
  // A ref, not just the `isPending` state below — the rAF loop (tick) is
  // set up once on mount and must read the *current* pending flag on
  // every frame without itself being recreated (recreating it would mean
  // re-running the whole mount effect, tearing the camera stream down and
  // re-requesting it on every pending/idle transition).
  const isPendingRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const submit = useCallback(
    (text: string) => {
      isPendingRef.current = true;
      setIsPending(true);
      const run = scan ? scan(text) : checkInGuestAction(eventId, text);
      run
        .then((res) => {
          setResult({ ...res, at: Date.now() });
          // Door staff aren't necessarily looking at the screen the
          // instant they hold up a card — a short buzz confirms the scan
          // registered without needing to glance down. No-op wherever the
          // Vibration API isn't supported (iOS Safari, desktop).
          navigator.vibrate?.(res.error ? [80, 80, 80] : 60);
        })
        .finally(() => {
          isPendingRef.current = false;
          setIsPending(false);
        });
    },
    [eventId, scan],
  );

  // Scanning itself never pauses (see tick's isRepeat guard instead), so
  // the result banner clears on its own after a few seconds and the
  // screen is ready for the next guest without a tap — the manual button
  // below is only for dismissing it sooner.
  useEffect(() => {
    if (!result) return;
    const timeout = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(timeout);
  }, [result]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const now = Date.now();
          const last = lastScannedRef.current;
          // Same code re-seen within 3s of its own last submit — the card
          // is probably just still sitting in frame, not a new scan.
          const isRepeat = last && last.text === code.data && now - last.at < 3000;
          if (!isRepeat && !isPendingRef.current) {
            lastScannedRef.current = { text: code.data, at: now };
            submit(code.data);
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [submit]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setCameraError(t('cameraError')));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // tick is intentionally excluded — re-subscribing it on every render
    // (it closes over isPending) would tear the camera stream down and
    // re-request it constantly instead of just continuing the same loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  if (cameraError) {
    return (
      <Alert variant="destructive">
        <CameraOffIcon />
        <AlertDescription>{cameraError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-foreground relative aspect-square w-full overflow-hidden rounded-2xl">
        {}
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="border-background/70 pointer-events-none absolute inset-8 rounded-2xl border-4" />
      </div>

      {result && (
        <Alert variant={result.error ? 'destructive' : 'default'}>
          {result.error ? <XCircleIcon /> : <CheckCircle2Icon />}
          <AlertDescription>
            {result.error
              ? t(`errors.${result.error}`)
              : result.alreadyCheckedIn
                ? t('alreadyCheckedIn', {
                    name: result.guestName ?? '',
                    time: result.checkedInAt
                      ? new Date(result.checkedInAt).toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '',
                  })
                : t('checkedIn', { name: result.guestName ?? '', count: result.partySize ?? 1 })}
          </AlertDescription>
        </Alert>
      )}

      {!result && (
        <p className="text-muted-foreground text-center text-sm">
          {isPending ? t('scanning') : t('instructions')}
        </p>
      )}

      {result && (
        <Button variant="outline" onClick={() => setResult(null)} className="w-fit self-center">
          {t('scanNext')}
        </Button>
      )}
    </div>
  );
}
