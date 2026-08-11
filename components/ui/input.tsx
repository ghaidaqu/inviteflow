import * as React from 'react';

import { cn } from '@/lib/utils';

// Plain native <input>, not Base UI's <Input>/<Field.Control> primitive:
// that primitive destructures `defaultValue` out of props and only re-applies
// it when explicitly given a `value`/`defaultValue` prop, which silently
// drops react-hook-form's uncontrolled `register()` pattern (RHF sets the
// initial value imperatively via its ref callback, never through a
// `defaultValue` prop) — every edit form using `register()` rendered
// existing data as blank fields. A native element has none of that
// indirection, so RHF's ref-based defaultValues work exactly as intended.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
