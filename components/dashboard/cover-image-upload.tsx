'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadCoverImageAction } from '@/lib/actions/uploads';
import { ImageUpIcon, XIcon, Loader2Icon } from 'lucide-react';

// The organizer's choice is genuinely theirs here — this doesn't replace
// InviteFlow's own templates (that's a separate, later "pick a design"
// step), it just makes "I already have my own invitation image/design"
// an actual upload instead of requiring them to have it hosted somewhere
// else already and paste a URL in.
export function CoverImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations('Events.form.upload');
  const tErrors = useTranslations('Events.form.upload.errors');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUploading] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The organizer might upload either — a still cover photo or a short
  // background video/reel — so the preview needs to know which it got
  // back, not just assume <img>. Inferred from the file extension since
  // that's all a bare URL string gives us once it's saved.
  const isVideo = /\.(mp4|webm|mov)$/i.test(value);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set('file', file);

    startUploading(async () => {
      const result = await uploadCoverImageAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        onChange(result.url);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative w-fit">
          {isVideo ? (
            <video
              src={value}
              className="h-32 w-56 rounded-lg border object-cover"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-32 w-56 rounded-lg border object-cover" />
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="absolute -end-2 -top-2 rounded-full"
            onClick={() => onChange('')}
            aria-label={t('remove')}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-fit"
        >
          {isUploading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ImageUpIcon className="size-4" />
          )}
          {isUploading ? t('uploading') : t('choose')}
        </Button>
      )}

      {error && (
        <Alert variant="destructive" className="w-fit">
          <AlertDescription>{tErrors(error as 'uploadFailed')}</AlertDescription>
        </Alert>
      )}

      <p className="text-muted-foreground text-xs">{t('hint')}</p>
    </div>
  );
}
