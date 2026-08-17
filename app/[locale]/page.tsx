import { setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
import { WhyInviteFlow } from '@/components/marketing/why-inviteflow';
import { ProductPreviews } from '@/components/marketing/product-previews';
import { OccasionGallery } from '@/components/marketing/occasion-gallery';
import { PricingSection } from '@/components/marketing/pricing-section';
import { FinalCta } from '@/components/marketing/final-cta';
import { SiteFooter } from '@/components/marketing/site-footer';

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteNav />
      <main className="flex flex-col">
        <HeroJourneys locale={locale} />
        <WhyInviteFlow />
        <OccasionGallery />
        <ProductPreviews />
        <PricingSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
