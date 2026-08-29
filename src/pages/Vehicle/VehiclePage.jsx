// src/pages/Vehicle/VehiclePage.jsx — Advika Auto Vehicle class
// See design_handoff_advika_auto/README.md, screen 2 "Vehicle class".
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import Seo from '@/components/Shared/Seo';
import AdvikaHeader from '@/components/Layout/AdvikaHeader';
import AdvikaFooter from '@/components/Layout/AdvikaFooter';
import PromiseStrip from '@/components/Shared/PromiseStrip';
import AdvikaProductCard from '@/components/Product/AdvikaProductCard';
import { fetchProducts } from '@/services/productsService';
import { handleError } from '@/utils/errorHandler';
import { useBrandPhone } from '@/hooks/useBrandPhone';
import { VEHICLE_CLASSES, CATEGORIES, getVehicleClass } from '@/config/advikaAuto';

export default function VehiclePage() {
  const { t } = useTranslation();
  const { classId } = useParams();
  const navigate = useNavigate();
  const { tel: BRAND_PHONE_TEL } = useBrandPhone();
  const activeClass = getVehicleClass(classId);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const activePillRef = useRef(null);

  // Centers the active pill in the scroll strip on every class change, so
  // the next pill (e.g. selecting "Medium vehicle" reveals "Big vehicle")
  // peeks into view instead of the selection landing flush against the
  // edge with no hint there's more to scroll to.
  useEffect(() => {
    activePillRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeClass.id]);

  useEffect(() => {
    if (!classId || !VEHICLE_CLASSES.some((c) => c.id === classId)) {
      navigate('/vehicle/small', { replace: true });
    }
  }, [classId, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // README's "Domain rule: 12V vs 24V": "The product list is
        // driven by the class's voltage, so a 12V class never surfaces
        // a 24V-only part." Fetched unfiltered (a wider pool than the
        // 4 the grid shows) and filtered client-side rather than via
        // the backend's `voltage` query param, because that param is a
        // strict AND — it would also exclude every non-electrical
        // accessory (seat covers, mud flaps, …), which carries no
        // voltage at all and fits every vehicle regardless of class.
        const { items } = await fetchProducts({ limit: 24, sort: 'isBestSeller', order: 'desc' });
        const scoped = items
          .filter((p) => !p.voltage || String(p.voltage).includes(activeClass.voltage))
          .slice(0, 4);
        if (!cancelled) setProducts(scoped);
      } catch (err) {
        if (!cancelled) handleError(err, "Couldn't load products for this vehicle.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId, activeClass.voltage]);

  const className = t(`advika.vehicleClass.${activeClass.id}`);

  return (
    <div className="aa-shell aa-page-vehicle min-h-screen bg-advika-warm-white">
      <Seo canonicalPath={`/vehicle/${activeClass.id}`} description={t('advika.landing.subhead')} />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Class hero + voltage card. This is one shared component for
            every vehicle class (small/medium/big/tractor) — the
            structure/styling below is identical for all four; only
            activeClass's data (icon, title, subtitle, voltage, battery
            copy) changes per page, so all four stay pixel-consistent by
            construction. */}
        <div className="flex flex-col gap-[15px] bg-advika-near-black px-4 pb-5 pt-[22px]">
          <Link to="/" className="aa-label flex items-center gap-[6px] text-[10.5px] uppercase text-advika-grey600">
            <Icon name="arrow_back" size={15} /> {t('common.home', 'Home')}
          </Link>
          <div className="flex items-start gap-[13px]">
            <Icon name={activeClass.icon} size={activeClass.iconSize} className="text-advika-orange" />
            <div className="flex flex-col gap-[6px]">
              <span className="aa-label text-[9.5px] text-advika-orange">{t('advika.vehicle.shoppingFor', 'SHOPPING FOR')}</span>
              <h1 className="aa-title-sm text-white">{className}</h1>
              <span className="text-[12.5px] leading-[1.5] text-advika-grey600">{t(`advika.vehicleClass.examples.${activeClass.id}`)}</span>
            </div>
          </div>

          {/* Voltage card */}
          <div className="flex items-center gap-[11px] rounded border border-[#333] bg-advika-panel px-[14px] py-[13px]">
            <Icon name="bolt" size={22} className="text-advika-orange" />
            <div className="flex flex-col gap-[3px]">
              <div className="flex items-center gap-[7px]">
                <span className="aa-mono text-[15px] font-semibold text-advika-orange">{activeClass.voltage}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-advika-grey800" />
                <span className="text-[12px] font-semibold text-[#e5e5e5]">
                  {t(`advika.battery.${activeClass.voltage}`)}
                </span>
              </div>
              <p className="text-[11.5px] leading-[1.45] text-[#e5e5e5]">
                {t(`advika.vehicle.voltageNote.${activeClass.id}`)}
              </p>
              <p className="pt-[2px] text-[11px] font-semibold leading-[1.4] text-advika-orange">
                {t('advika.vehicle.voltPick', "Pick parts to match your vehicle's voltage")}
              </p>
            </div>
          </div>
        </div>

        {/* Class chips — own chrome band with a right-edge fade hinting
            there's more to scroll, per design. */}
        <div className="relative border-b border-advika-border-dark bg-advika-chrome">
          <div className="aa-hide-scrollbar flex gap-2 overflow-x-auto px-[14px] py-3">
            {VEHICLE_CLASSES.map((cls) => (
              <Link
                key={cls.id}
                ref={cls.id === activeClass.id ? activePillRef : null}
                to={`/vehicle/${cls.id}`}
                className={`flex h-[38px] shrink-0 items-center gap-[7px] rounded-full px-[15px] text-[12.5px] font-semibold ${
                  cls.id === activeClass.id
                    ? 'bg-advika-orange text-white'
                    : 'border border-[#333] text-advika-grey600'
                }`}
              >
                <Icon name={cls.icon} size={17} />
                {t(`advika.vehicleClass.${cls.id}`)}
              </Link>
            ))}
            <div className="w-[10px] shrink-0" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-[34px]"
            style={{ backgroundImage: 'linear-gradient(90deg, rgba(23,23,23,0) 0%, #171717 74%)' }}
          />
        </div>

        {/* Is your vehicle in this group? */}
        <section className="px-[14px] pt-[18px]">
          <h2 className="mb-3 font-archivoBlack text-[18px] leading-[1.15] text-advika-chrome">
            {t('advika.vehicle.inGroupTitle', 'Is your vehicle in this group?')}
          </h2>
          <div className="flex flex-col gap-[11px] rounded border border-advika-border-light bg-white p-[15px]">
            <p className="text-[12.5px] leading-[1.55] text-advika-grey800">
              {t('advika.vehicle.inGroupExplainer')}
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {activeClass.models.map((model) => (
                <span key={model} className="rounded-[3px] border border-advika-border-light bg-advika-off-white px-[10px] py-[7px] text-[12px] font-semibold text-advika-grey900">
                  {model}
                </span>
              ))}
              <span className="rounded-[3px] border border-dashed border-advika-grey400 px-[10px] py-[7px] text-[12px] text-advika-grey600">
                {t('advika.vehicle.othersLikeThese', 'and other similar vehicles')}
              </span>
            </div>
            <a
              href={BRAND_PHONE_TEL}
              className="mt-[2px] flex h-11 items-center justify-center gap-[7px] rounded-[3px] border-[1.5px] border-advika-chrome text-[12px] font-bold text-advika-chrome"
            >
              <Icon name="chat" size={16} /> {t('advika.vehicleClass.askOnCall', 'NOT SURE? ASK US ON CALL')}
            </a>
          </div>
        </section>

        {/* Popular in this group */}
        <section className="px-[14px] pt-[22px]">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="aa-section-title text-advika-chrome" style={{ fontSize: 19, lineHeight: 1.15 }}>{t('advika.vehicle.popularTitle', 'Popular in this group')}</h2>
            <Link to="/products" className="text-[11px] font-semibold text-advika-orange-dark">{t('advika.landing.seeAll', 'See all')} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3" aria-busy={loading}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)
              : products.map((p) => <AdvikaProductCard key={p.id} product={p} imageHeight={112} fallbackIconSize={44} dense />)}
          </div>
        </section>

        {/* Parts for your [class] */}
        <section className="px-[14px] pt-[22px]">
          <h2 className="mb-3 font-archivoBlack text-[19px] leading-[1.15] text-advika-chrome">
            {t('advika.vehicle.partsForTitle', { class: className })}
          </h2>
          <div className="grid grid-cols-2 gap-[11px]">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.label)}&vehicle=${activeClass.id}`}
                className="flex flex-col gap-[7px] rounded border border-advika-border-light bg-white px-[13px] py-[14px]"
              >
                <Icon name={cat.icon} size={26} className="text-advika-orange" />
                <span className="text-[13.5px] font-bold leading-[1.25] text-advika-chrome">{t(`advika.category.${cat.id}`)}</span>
                <span className="aa-label text-[10px] text-advika-grey700">{t(`advika.category.count.${cat.id}`, { defaultValue: '' })}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="px-[14px] pt-5">
          <PromiseStrip
            compact
            items={[
              { icon: 'payments', title: t('advika.promise.cod', 'Cash on Delivery') },
              { icon: 'local_shipping', title: t('advika.product.promiseShippingCompact', '3-4 Day Shipping') },
              { icon: 'receipt_long', title: t('advika.promise.gst', 'GST Bill') },
            ]}
          />
        </div>

        <AdvikaFooter />
      </main>
    </div>
  );
}
