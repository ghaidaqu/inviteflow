'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadCoverImageAction } from '@/lib/actions/uploads';
import { ImageUpIcon, XIcon, Loader2Icon } from 'lucide-react';

/**
 * Logo upload for the Institutional track — same storage/action as
 * CoverImageUpload (one bucket, one rate-limit budget per user), but
 * image-only (a logo is never a video) and previewed small/square instead
 * of as a wide cover strip.
 */
export function OrgLogoUpload({
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
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="bg-muted h-20 w-20 rounded-xl border object-contain p-2"
          />
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
    </div>
  );
}
