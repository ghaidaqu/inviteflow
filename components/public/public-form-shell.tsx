/**
 * Shared visual shell for the guest-facing form pages that people reach via
 * a direct link (RSVP, the standalone Link registration flow) — same warm
 * gradient backdrop, icon badge, and entrance treatment as the rest of the
 * redesigned public surfaces (homepage, guest hub, event page), so these
 * don't feel like a separate, uncared-for step in the flow.
 */
export function PublicFormShell({
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
    <main className="relative mx-auto w-full max-w-xl overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/15 absolute start-[-25%] top-[-20%] size-[22rem] rounded-full blur-3xl" />
        <div className="bg-accent/20 absolute end-[-20%] bottom-[-25%] size-[20rem] rounded-full blur-3xl" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-2xl">
          {icon}
        </div>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
