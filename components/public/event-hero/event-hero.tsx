import { ClassicHero } from './classic-hero';
import { EditorialHero } from './editorial-hero';
import { MinimalHero } from './minimal-hero';
import { isEventTemplate, type EventHeroProps } from './types';

export function EventHero({ template, ...props }: EventHeroProps & { template: string }) {
  const resolved = isEventTemplate(template) ? template : 'classic';

  if (resolved === 'editorial') return <EditorialHero {...props} />;
  if (resolved === 'minimal') return <MinimalHero {...props} />;
  return <ClassicHero {...props} />;
}

export { EVENT_TEMPLATES, type EventTemplate } from './types';
