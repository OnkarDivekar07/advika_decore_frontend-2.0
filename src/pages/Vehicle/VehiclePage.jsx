// src/pages/Vehicle/VehiclePage.jsx — Advika Auto Vehicle class
// See design_handoff_advika_auto/README.md, screen 2 "Vehicle class".
import React, { useEffect, useState } from 'react';
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
import { VEHICLE_CLASSES, CATEGORIES, BRAND_PHONE_TEL, getVehicleClass } from '@/config/advikaAuto';

export default function VehiclePage() {
  const { t } = useTranslation();
  const { classId } = useParams();
  const navigate = useNavigate();
  const activeClass = getVehicleClass(classId);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="aa-shell min-h-screen bg-white">
      <Seo canonicalPath={`/vehicle/${activeClass.id}`} description={t('advika.landing.subhead')} />
      <AdvikaHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Class hero */}
        <div className="flex flex-col gap-[15px] bg-advika-near-black px-4 pb-5 pt-[22px]">
          <Link to="/" className="aa-label flex items-center gap-[6px] text-[10.5px] uppercase text-advika-grey600">
            <Icon name="arrow_back" size={15} /> {t('common.home', 'Home')}
          </Link>
          <div className="flex items-center gap-[13px]">
            <Icon name={activeClass.icon} size={activeClass.iconSize} className="text-advika-orange" />
            <div className="flex flex-col">
              <span className="aa-label text-[9.5px] text-advika-orange">{t('advika.vehicle.shoppingFor', 'SHOPPING FOR')}</span>
              <h1 className="aa-title-sm text-white">{className}</h1>
              <span className="text-[12.5px] text-advika-grey600">{t(`advika.vehicleClass.examples.${activeClass.id}`)}</span>
            </div>
          </div>
        </div>

        {/* Voltage band */}
        <div className="mx-4 mt-[14px] flex items-center gap-[11px] rounded border border-[#333] bg-advika-panel p-[13px]">
          <Icon name="bolt" size={22} className="text-advika-orange" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-[7px]">
              <span className="aa-mono text-[15px] font-semibold text-advika-orange">{activeClass.voltage}</span>
              <span className="h-1 w-1 rounded-full bg-advika-border-dark4" />
              <span className="text-[11px] font-semibold text-advika-grey600">
                {t(`advika.battery.${activeClass.voltage}`)}
              </span>
            </div>
            <p className="text-[11.5px] leading-[1.45] text-[#e5e5e5]">
              {t(`advika.vehicle.voltageNote.${activeClass.id}`)}
            </p>
            <p className="text-[11px] font-bold text-advika-orange">
              {t('advika.categoryPage.voltPick', 'Pick the voltage that matches your vehicle — 12V or 24V')}
            </p>
          </div>
        </div>

        {/* Class chips */}
        <div className="flex gap-2 overflow-x-auto border-b border-advika-border-dark bg-advika-chrome px-[14px] py-3">
          {VEHICLE_CLASSES.map((cls) => (
            <Link
              key={cls.id}
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
        </div>

        {/* Is your vehicle in this group? */}
        <section className="px-4 pt-5">
          <h2 className="mb-[11px] font-archivoBlack text-[18px] text-advika-chrome">
            {t('advika.vehicle.inGroupTitle', 'Is your vehicle in this group?')}
          </h2>
          <div className="flex flex-col gap-[11px] bg-white p-[15px] shadow-card">
            <p className="text-[12.5px] leading-[1.55] text-advika-grey800">
              {t('advika.vehicle.inGroupExplainer')}
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {activeClass.models.map((model) => (
                <span key={model} className="rounded-[3px] border border-advika-border-light bg-advika-off-white px-[10px] py-[7px] text-[12px] font-semibold text-advika-grey900">
                  {model}
                </span>
              ))}
              <span className="rounded-[3px] border border-dashed border-advika-grey400 px-[10px] py-[7px] text-[12px] text-advika-grey650">
                {t('advika.vehicle.othersLikeThese', 'and other similar vehicles')}
              </span>
            </div>
            <a
              href={BRAND_PHONE_TEL}
              className="flex h-11 items-center justify-center gap-2 rounded-[3px] border-[1.5px] border-advika-chrome text-[12px] font-bold text-advika-chrome"
            >
              <Icon name="chat" size={16} /> {t('advika.vehicleClass.askOnCall', 'NOT SURE? ASK US ON CALL')}
            </a>
          </div>
        </section>

        {/* Parts for your [class] */}
        <section className="px-4 pt-6">
          <h2 className="mb-[11px] font-archivoBlack text-[19px] text-advika-chrome">
            {t('advika.vehicle.partsForTitle', { class: className })}
          </h2>
          <div className="grid grid-cols-2 gap-[11px]">
            {/* Vehicle page's own category grid omits Safety & Tools — the
                wireframe's per-page `cats` array for this screen is
                Lights/Horns/Interior/Exterior/Electrical/Spares only,
                unlike Landing's 7-tile set (see Advika Auto - Vehicle.dc.html). */}
            {CATEGORIES.filter((cat) => cat.id !== 'safety').map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.label)}&vehicle=${activeClass.id}`}
                className="flex flex-col gap-[7px] border border-advika-border-light bg-white px-[13px] py-[14px]"
              >
                <Icon name={cat.icon} size={26} className="text-advika-orange" />
                <span className="text-[13.5px] font-bold text-advika-chrome">{t(`advika.category.${cat.id}`)}</span>
                <span className="text-[10px] text-advika-grey700">{t(`advika.category.count.${cat.id}`, { defaultValue: '' })}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular in this group */}
        <section className="px-4 pb-6 pt-6">
          <div className="mb-[11px] flex items-baseline justify-between">
            <h2 className="aa-section-title text-advika-chrome" style={{ fontSize: 19 }}>{t('advika.vehicle.popularTitle', 'Popular in this group')}</h2>
            <Link to="/products" className="text-[11px] font-semibold text-advika-orange-dark">{t('advika.landing.seeAll', 'See all')} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3" aria-busy={loading}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)
              : products.map((p) => <AdvikaProductCard key={p.id} product={p} imageHeight={112} dense />)}
          </div>
        </section>

        <div className="px-4 pb-6">
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
