// src/components/Layout/AdvikaFooter.jsx
//
// Shared footer — every screen except Login/OTP. See
// design_handoff_advika_auto/README.md "Shared: Footer".
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_TEL } from '@/config/advikaAuto';

function LinkRow({ to, href, icon, label }) {
  const content = (
    <>
      <Icon name={icon} size={20} className="text-advika-orange" />
      <span className="flex-1 text-[14px] text-white">{label}</span>
      <Icon name="chevron_right" size={18} className="text-[#525252]" />
    </>
  );
  const className = 'flex h-[54px] items-center gap-3 border-t border-advika-border-dark';
  return href ? (
    <a href={href} className={className}>{content}</a>
  ) : (
    <Link to={to} className={className}>{content}</Link>
  );
}

export default function AdvikaFooter() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <footer className="mt-[30px] flex flex-col gap-[22px] border-t border-advika-border-dark bg-advika-ink px-4 pt-7">
      {/* Brand block */}
      <div className="flex flex-col gap-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] bg-advika-orange">
            <Icon name="bolt" className="text-white" size={18} />
          </span>
          <span className="font-archivoBlack text-[15px] text-white">{t('advika.brand.name', 'ADVIKA AUTO')}</span>
        </Link>
        <p className="text-[13px] leading-[1.6] text-advika-grey600">
          {t('advika.footer.blurb', 'Decorative lights and accessories for trucks, pickups, tempos and tractors.')}
        </p>
      </div>

      {/* Link list — four rows, always present (README's Shared: Footer
          spec lists exactly these four: "Track my order → tracking ·
          Login → login · My orders → account · Contact us → tel:"). Kept
          static rather than swapping Login for My orders by auth state —
          the design's own footer treats it as a fixed sitemap, not an
          adaptive one, and "Login" still has a legitimate job signed in
          (switch accounts / re-auth after a token expiry). */}
      <div className="flex flex-col">
        <LinkRow to={isAuthenticated ? '/profile?tab=orders' : '/login'} icon="local_shipping" label={t('advika.footer.trackOrder', 'Track my order')} />
        <LinkRow to="/login" icon="login" label={t('advika.footer.login', 'Login')} />
        <LinkRow to="/profile?tab=orders" icon="receipt_long" label={t('advika.footer.myOrders', 'My orders')} />
        <LinkRow href={BRAND_PHONE_TEL} icon="support_agent" label={t('advika.footer.contactUs', 'Contact us')} />
      </div>

      {/* Contact block */}
      <div className="flex flex-col gap-[14px] border-t border-advika-border-dark pt-5">
        <a href={BRAND_PHONE_TEL} className="flex items-center gap-3">
          <Icon name="call" size={18} className="text-advika-orange" />
          <span className="flex flex-col">
            <span className="aa-mono text-[14px] text-white">{BRAND_PHONE_DISPLAY}</span>
            <span className="text-[10.5px] text-[#737373]">{t('advika.footer.hours', 'Mon-Sat, 9AM-7PM')}</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <Icon name="location_on" size={18} className="text-advika-orange" />
          <span className="flex flex-col">
            <span className="text-[13px] text-white">{t('advika.footer.address1', 'Wakad, Pune — 411057')}</span>
            <span className="text-[11px] text-[#737373]">{t('advika.footer.address2', 'Maharashtra, India')}</span>
          </span>
        </div>
      </div>

      {/* Legal row */}
      <div className="flex flex-wrap gap-[14px] border-t border-advika-border-dark pb-[26px] pt-4 text-[9.5px] text-[#737373]">
        <span>{t('advika.footer.copyright', '© 2026 Advika Auto')}</span>
        <span>{t('advika.footer.privacy', 'Privacy')}</span>
        <span>{t('advika.footer.terms', 'Terms')}</span>
      </div>
    </footer>
  );
}
