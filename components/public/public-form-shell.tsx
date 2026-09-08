import { GuestFooter } from '@/components/public/guest-footer';
import { SiteNav } from '@/components/marketing/site-nav';

/**
 * Shared visual shell for the guest-facing form pages that people reach via
 * a direct link (try-it-free, RSVP, its edit page, the questions
 * follow-up) — plain ivory background matching the rest of the site (no
 * blurred color-blob backdrop — that read as a generic "SaaS gradient"
 * effect, out of step with the site's own flat editorial identity), just
 * the icon badge and entrance treatment so these don't feel like a
 * separate, uncared-for step in the flow. The same marketing SiteNav every
 * other page uses (its own logo already links home) gives these pages a
 * real way back to the site — these had none at all before, and someone
 * who only ever had a guest link or a WhatsApp message otherwise has no
 * path to مهلّي's own homepage if they decide to make their own invitation.
 */
export async function PublicFormShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-2xl">
            {icon}
          </div>
          <h1 className="font-display mb-1 text-2xl text-balance">{title}</h1>
          {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}
          {children}
          <GuestFooter />
        </div>
      </main>
    </>
  );
}
