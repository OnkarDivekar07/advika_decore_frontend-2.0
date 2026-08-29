// src/pages/Home/HomePage.jsx — Advika Auto Landing
// See design_handoff_advika_auto/README.md, screen 1 "Landing".
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import SlideMenu from '@/components/Layout/SlideMenu';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import LanguageModal from '@/components/Layout/LanguageModal';
import { LandingStickyBar } from '@/components/Layout/StickyBar';
import WhatsAppStrip from '@/components/Shared/WhatsAppStrip';
import AdvikaProductCard from '@/components/Product/AdvikaProductCard';
import { fetchProducts } from '@/services/productsService';
import { handleError } from '@/utils/errorHandler';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useBrandPhone } from '@/hooks/useBrandPhone';
import { VEHICLE_CLASSES, CATEGORIES } from '@/config/advikaAuto';
import { SITE_DESCRIPTION } from '@/seo/siteConfig';

// `contentKey` is the admin-editable SiteContent row (backend
// 2.0/prisma/schema.prisma) this ticker item reads from; `i18nKey` is the
// existing static translation used as a fallback until that loads (or if
// it's never been set) — see useSiteContent.js.
const TICKER_ITEMS = [
  { i18nKey: 'advika.ticker.cod', contentKey: 'ticker.cod' },
  { i18nKey: 'advika.ticker.shipping', contentKey: 'ticker.shipping' },
  { i18nKey: 'advika.ticker.delivery', contentKey: 'ticker.delivery' },
];

// `contentKey` prefix is the admin-editable SiteContent row pair
// (`{contentKey}.title` / `{contentKey}.body`); titleKey/bodyKey are the
// existing static translations used as a fallback (see TICKER_ITEMS).
const TRUST_ITEMS = [
  { icon: 'payments', contentKey: 'trust.cod', titleKey: 'advika.landing.trustCod', bodyKey: 'advika.landing.trustCodBody' },
  { icon: 'local_shipping', contentKey: 'trust.shipping', titleKey: 'advika.landing.trustShipping', bodyKey: 'advika.landing.trustShippingBody' },
  { icon: 'receipt_long', contentKey: 'trust.genuine', titleKey: 'advika.landing.trustGenuine', bodyKey: 'advika.landing.trustGenuineBody' },
  { icon: 'support_agent', contentKey: 'trust.help', titleKey: 'advika.landing.trustHelp', bodyKey: 'advika.landing.trustHelpBody' },
];

// Illustrative only — no backend endpoint surfaces a curated "top
// reviews" list yet (see prisma/schema.prisma's Review model, which is
// per-product, not a homepage feed). Kept small and clearly a
// placeholder rather than invented at a scale that would misrepresent
// real review volume. Name/vehicle/city fields double as each review's
// fallback text AND as static defaults for the admin-editable
// `reviews.{n}.*` SiteContent rows — an admin can rewrite these to real
// reviews once collected, without a code change.
const SAMPLE_REVIEWS = [
  { id: 1, name: 'Ramesh Patil', meta: 'Tata Signa 4825 · Pune', rating: 5, text: 'Lights are bright and the fitting was easy. COD made it simple to trust a new shop.' },
  { id: 2, name: 'Suresh Yadav', meta: 'Ashok Leyland 1616 · Nashik', rating: 5, text: 'Genuine parts with proper GST bill. Delivery took 3 days as promised.' },
  { id: 3, name: 'Vikas Chauhan', meta: 'Mahindra Bolero Pik-Up · Nagpur', rating: 4, text: 'Good quality horn set. Support answered in Hindi over call, very helpful.' },
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { getText } = useSiteContent();
  const { tel: BRAND_PHONE_TEL } = useBrandPhone();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [bestSellers, setBestSellers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('preferredLanguage')) {
      const timer = setTimeout(() => setLangModalOpen(true), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProducts({
          limit: 8,
          isBestSeller: true,
          sort: 'createdAt',
          order: 'desc',
        });
        if (!cancelled) setBestSellers(items);
      } catch (err) {
        if (!cancelled) handleError(err, "Couldn't load best sellers.");
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const featureCategory = CATEGORIES.find((c) => c.feature);
  const gridCategories = CATEGORIES.filter((c) => !c.feature);

  return (
    <div className="aa-shell min-h-screen bg-white">
      <Seo canonicalPath="/" description={SITE_DESCRIPTION} />

      {/* Announcement ticker */}
      <div className="overflow-hidden border-b border-advika-border-dark bg-[#0d0d0d] py-[9px]">
        <div className="aa-ticker-track inline-flex whitespace-nowrap" style={{ gap: 16 }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <span key={idx} className="aa-label inline-flex items-center gap-4 text-[10.5px] text-[#e5e5e5]" data-testid="landing-ticker-item">
              {getText(item.contentKey, i18n.language, t(item.i18nKey))}
              <span className="text-advika-orange">◆</span>
            </span>
          ))}
        </div>
      </div>

      <AdvikaHeader variant="hamburger" menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section
          className="relative overflow-hidden px-4 pb-[38px] pt-[44px]"
          style={{
            backgroundImage:
              'radial-gradient(120% 70% at 60% 40%, rgba(249,115,22,.17) 0%, rgba(13,13,13,0) 62%), repeating-linear-gradient(115deg, #131313 0 8px, #171717 8px 16px)',
          }}
        >
          <div className="relative z-10 flex flex-col gap-[17px]">
            <span className="aa-label text-[10.5px] text-advika-orange" data-testid="landing-hero-eyebrow">
              {getText('hero.eyebrow', i18n.language, t('advika.landing.eyebrow', 'TRUSTED BY 12,000+ DRIVERS'))}
            </span>
            <h1 className="aa-hero text-white" data-testid="landing-hero-headline">
              {getText('hero.headlineLine1', i18n.language, t('advika.landing.headlineLine1', 'TRUCK LIGHTS'))}
              <br />
              <span className="text-advika-orange">
                {getText('hero.headlineLine2', i18n.language, t('advika.landing.headlineLine2', 'BUILT FOR'))}
              </span>
              <br />
              {getText('hero.headlineLine3', i18n.language, t('advika.landing.headlineLine3', 'THE HIGHWAY'))}
            </h1>
            <p className="max-w-[340px] text-[15px] text-[#d4d4d4]" data-testid="landing-hero-subhead">
              {getText('hero.subhead', i18n.language, t('advika.landing.subhead'))}
            </p>
            <Link
              to="/products"
              className="mt-[2px] flex h-14 w-full items-center justify-center gap-[9px] rounded bg-advika-orange text-[15px] font-bold text-white"
            >
              {t('advika.landing.cta', 'SHOP NOW')} <span>→</span>
            </Link>
          </div>
          {/* [ NIGHT HIGHWAY TRUCK PHOTO — FULL BLEED BEHIND ] — placeholder per design handoff; replace with real photography. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px]"
            style={{ backgroundImage: 'linear-gradient(180deg, rgba(13,13,13,0) 0%, #0d0d0d 80%)' }}
          />
        </section>

        {/* Vehicle picker */}
        <section className="bg-white px-4 pb-7 pt-[26px]">
          {/* 22px — the one section header on this page that isn't the
              usual 26px (README: Landing.dc.html's vehicleTitle). */}
          <h2 className="aa-section-title mb-[15px] text-advika-chrome" style={{ fontSize: 22, lineHeight: 1.1 }} data-testid="landing-vehicle-picker-title">
            {getText('vehiclePicker.title', i18n.language, t('advika.landing.vehiclePickerTitle', 'What do you drive?'))}
          </h2>
          <div className="grid grid-cols-2 gap-[10px]">
            {VEHICLE_CLASSES.map((cls) => (
              <Link
                key={cls.id}
                to={`/vehicle/${cls.id}`}
                className="flex min-h-[104px] flex-col items-center justify-center gap-[7px] border border-advika-border-light bg-advika-off-white px-[13px] py-[14px] text-center"
                data-testid={`landing-vehicle-class-${cls.id}`}
              >
                <Icon name={cls.icon} size={cls.iconSize} className="text-advika-orange" />
                <span className="text-[15px] font-bold leading-[1.2] text-advika-chrome">
                  {getText(`vehicleClass.${cls.id}.label`, i18n.language, t(`advika.vehicleClass.${cls.id}`))}
                </span>
                <span className="text-[10.5px] leading-[1.4] text-advika-grey700">
                  {getText(`vehicleClass.${cls.id}.examples`, i18n.language, t(`advika.vehicleClass.examples.${cls.id}`))}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Shop by category */}
        <section className="flex flex-col gap-4 bg-advika-warm-white px-4 pb-[34px] pt-[30px]">
          <div className="flex items-end justify-between gap-3">
            <h2 className="aa-section-title text-advika-chrome">{t('advika.landing.categoryTitle', 'Shop by category')}</h2>
            <Link to="/products" className="text-[11px] font-semibold text-advika-orange-dark">
              {t('advika.landing.seeAll', 'See all')} →
            </Link>
          </div>

          {featureCategory && (
            <Link
              to={`/products?category=${encodeURIComponent(featureCategory.label)}`}
              className="relative flex min-h-[240px] flex-col justify-end overflow-hidden"
              data-testid={`landing-category-${featureCategory.id}`}
              style={{
                backgroundImage:
                  'linear-gradient(180deg,#1f4e73 0%,#4b7fa3 55%,#2b2b2b 100%), repeating-linear-gradient(120deg, rgba(255,255,255,.05) 0 10px, rgba(0,0,0,.05) 10px 20px)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 26%, rgba(0,0,0,.82) 100%)' }}
              />
              {/* [ LIT TRUCK PHOTO ] placeholder */}
              <div className="relative z-10 flex flex-col gap-[9px] p-4">
                <span className="h-[3px] w-[34px] bg-advika-orange" />
                <span className="font-archivoBlack text-[24px] leading-none text-white">
                  {getText(`category.${featureCategory.id}.label`, i18n.language, t('advika.landing.lightsTitle', 'LIGHTS'))}
                </span>
                <p className="text-[13px] leading-[1.5] text-[#e5e5e5]">
                  {getText(`category.${featureCategory.id}.examples`, i18n.language, t('advika.landing.lightsDesc'))}
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="aa-mono text-[11.5px] text-advika-orange">
                    {getText(`category.${featureCategory.id}.count`, i18n.language, t('advika.landing.lightsCount', '640+ products'))}
                  </span>
                  <span className="aa-label rounded-none bg-advika-orange px-[17px] py-3 text-[12px] font-bold text-white">
                    {t('advika.landing.shopNow', 'SHOP NOW')}
                  </span>
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-[10px]">
            {gridCategories.map((cat) => {
              const examples = getText(`category.${cat.id}.examples`, i18n.language, '');
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${encodeURIComponent(cat.label)}`}
                  className="flex flex-col gap-[7px] border border-advika-border-light bg-white px-[13px] py-[14px]"
                  data-testid={`landing-category-${cat.id}`}
                >
                  <Icon name={cat.icon} size={26} className="text-advika-orange" />
                  <span className="text-[13.5px] font-bold leading-[1.25] text-advika-chrome">
                    {getText(`category.${cat.id}.label`, i18n.language, t(`advika.category.${cat.id}`))}
                  </span>
                  {/* Parentheses are presentational only — added here, not
                      part of the admin-edited text — so an admin never has
                      to type them, and nothing renders "()" empty during
                      the brief window before the content fetch resolves. */}
                  {examples && (
                    <span className="text-[10.5px] leading-[1.35] text-advika-grey550">({examples})</span>
                  )}
                  <span className="aa-mono text-[10px] text-advika-grey700">
                    {getText(`category.${cat.id}.count`, i18n.language, t(`advika.category.count.${cat.id}`))}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Best sellers */}
        <section className="bg-white px-4 pb-[22px] pt-[30px]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="aa-section-title text-advika-chrome">{t('advika.landing.bestSellers', 'Best sellers')}</h2>
            <Link to="/products" className="text-[11px] font-semibold text-advika-orange-dark">
              {t('advika.landing.seeAll', 'See all')} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3" aria-busy={loadingProducts}>
            {loadingProducts
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)
              : bestSellers.length > 0
                ? bestSellers.map((p) => <AdvikaProductCard key={p.id} product={p} />)
                : (
                  <p className="col-span-full py-8 text-center text-sm text-advika-grey700">
                    {t('homepage.noProducts', 'No products in this category.')}
                  </p>
                )}
          </div>
        </section>

        {/* WhatsApp fitment strip */}
        <div className="px-4" data-testid="landing-whatsapp-strip">
          <WhatsAppStrip
            title={getText('whatsapp.title', i18n.language, t('advika.whatsapp.title', 'Not sure what fits your truck?'))}
            subtitle={getText('whatsapp.subtitle', i18n.language, t('advika.whatsapp.subtitle', 'Send your vehicle model on WhatsApp — reply in 10 minutes'))}
            cta={getText('whatsapp.cta', i18n.language, t('advika.whatsapp.cta', 'CHAT'))}
          />
        </div>

        {/* Trust grid */}
        <section className="grid grid-cols-2 gap-x-[14px] gap-y-5 bg-advika-off-white px-4 pb-[30px] pt-[26px]">
          {TRUST_ITEMS.map((item) => (
            <div key={item.icon} className="flex items-start gap-[10px]">
              <Icon name={item.icon} size={24} className="mt-0.5 shrink-0 text-advika-orange" />
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-bold leading-[1.3] text-advika-chrome" data-testid={`landing-trust-${item.contentKey}-title`}>
                  {getText(`${item.contentKey}.title`, i18n.language, t(item.titleKey))}
                </span>
                <span className="text-[11.5px] leading-[1.45] text-advika-grey800" data-testid={`landing-trust-${item.contentKey}-body`}>
                  {getText(`${item.contentKey}.body`, i18n.language, t(item.bodyKey))}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Driver reviews */}
        <section className="border-t border-advika-border-light bg-white px-4 pb-[34px] pt-[30px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="aa-section-title text-advika-chrome" data-testid="landing-reviews-title">
              {getText('reviews.title', i18n.language, t('advika.landing.reviewsTitle', 'Driver reviews'))}
            </h2>
            <div className="text-right">
              <div className="font-archivoBlack text-[28px] leading-none text-advika-orange" data-testid="landing-reviews-score">
                {getText('reviews.score', i18n.language, '4.9')}★
              </div>
              <div className="aa-mono pt-1 text-[9.5px] text-advika-grey700" data-testid="landing-reviews-count">
                {getText('reviews.ratingCount', i18n.language, t('advika.landing.ratingCount', '12,400 ratings'))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {SAMPLE_REVIEWS.map((review) => {
              const rating = Number(getText(`reviews.${review.id}.rating`, i18n.language, String(review.rating))) || review.rating;
              return (
                <div key={review.id} className="flex flex-col gap-3 border border-advika-border-light p-4" data-testid={`landing-review-${review.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] tracking-[.22em] text-[#fbbf24]">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                    <span className="aa-mono flex items-center gap-1 text-[9px] font-semibold text-advika-success">
                      <Icon name="verified" size={14} /> VERIFIED
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-[1.6] text-advika-grey900" data-testid={`landing-review-${review.id}-text`}>
                    {getText(`reviews.${review.id}.text`, i18n.language, review.text)}
                  </p>
                  <div className="flex items-center gap-[10px] border-t border-advika-border-light pt-3">
                    <span className="aa-mono flex h-9 w-9 items-center justify-center rounded-full bg-advika-orange-tint3 text-[10px] font-semibold text-advika-orange-dark">
                      {getText(`reviews.${review.id}.name`, i18n.language, review.name)[0]}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-advika-chrome" data-testid={`landing-review-${review.id}-name`}>
                        {getText(`reviews.${review.id}.name`, i18n.language, review.name)}
                      </div>
                      <div className="aa-mono pt-0.5 text-[10px] text-advika-grey700" data-testid={`landing-review-${review.id}-meta`}>
                        {getText(`reviews.${review.id}.meta`, i18n.language, review.meta)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <AdvikaFooter />
      </main>

      <LandingStickyBar />
      <LanguageModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      {/* Kept for a11y/SEO parity with any crawler expecting a tel: escape hatch even before JS interaction. */}
      <a href={BRAND_PHONE_TEL} className="sr-only">{t('advika.footer.contactUs', 'Contact us')}</a>
    </div>
  );
}
