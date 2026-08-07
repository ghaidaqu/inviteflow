import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { SparklesIcon } from 'lucide-react';

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* Same warm brand backdrop as the homepage, so auth doesn't feel like a
          separate, uncared-for app. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/20 absolute start-[-15%] top-[-20%] size-[26rem] rounded-full blur-3xl" />
        <div className="bg-accent/30 absolute end-[-20%] bottom-[-15%] size-[24rem] rounded-full blur-3xl" />
      </div>

      <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 w-full max-w-md duration-500 ease-out">
        <Link
          href="/"
          className="text-primary mb-6 flex items-center justify-center gap-1.5 text-lg font-bold"
        >
          <SparklesIcon className="size-5" />
          InviteFlow
        </Link>

        <Card className="border-border/60 bg-card/90 shadow-primary/5 w-full shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
