// src/components/Shared/Footer.jsx
//
// Shared site footer (design_handoff_advika_auto/README.md "Shared: Footer
// (every screen except Login/OTP)"). Rendered by every routed page except
// OTPVerificationPage — that screen is a focused single-task flow where a
// full sitemap at the foot would invite abandonment, per the handoff.
//
// The wireframe's "Track my order" and "My orders" links resolve to a
// per-order tracking page and the account/orders screen respectively; this
// app doesn't have a dedicated tracking route yet (see the mapping table's
// "Order tracking" row — that's step 8's work), so "Track my order" points
// at the existing order list for now rather than a route that doesn't
// exist yet (the handoff is explicit: no dead links).
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MaterialIcon from '@/components/Shared/MaterialIcon';

const PHONE_TEL = 'tel:+919876543210';

export default function Footer() {
  const { t } = useTranslation();

  const links = [
    { icon: 'local_shipping', label: t('chrome.footer.trackOrder'), to: '/orders' },
    { icon: 'login', label: t('chrome.footer.login'), to: '/otp-verification' },
    { icon: 'receipt_long', label: t('chrome.footer.myOrders'), to: '/orders' },
    { icon: 'support_agent', label: t('chrome.footer.contactUs'), href: PHONE_TEL },
  ];

  return (
    // Full-bleed background (see Navbar.jsx's header comment for why),
    // content constrained to the same 520px shell as the header.
    <footer className="bg-advika-ink border-t border-advika-border-1 mt-[30px]">
      <div className="max-w-[520px] mx-auto pt-7 px-4 flex flex-col gap-[22px]">
        {/* Brand block */}
        <div className="flex flex-col gap-3">
          <Link to="/" className="flex items-center gap-[9px]">
            <span className="w-[30px] h-[30px] rounded-[6px] bg-advika-orange flex items-center justify-center shrink-0">
              <MaterialIcon name="bolt" size={18} color="#fff" />
            </span>
            <span className="font-archivo-black text-[15px] text-white">ADVIKA AUTO</span>
          </Link>
          <p className="text-[13px] leading-[1.6] text-advika-grey600 m-0">
            {t('chrome.footer.blurb')}
          </p>
        </div>

        {/* Link list */}
        <div className="flex flex-col">
          {links.map((link) => {
            const inner = (
              <>
                <MaterialIcon name={link.icon} size={20} color="#f97316" />
                <span className="flex-1 text-sm text-white">{link.label}</span>
                <MaterialIcon name="chevron_right" size={18} color="#525252" />
              </>
            );
            const className = 'h-[54px] border-t border-advika-border-1 flex items-center gap-3 no-underline';
            return link.to ? (
              <Link key={link.label} to={link.to} className={className}>
                {inner}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className={className}>
                {inner}
              </a>
            );
          })}
        </div>

        {/* Contact block */}
        <div className="border-t border-advika-border-1 pt-5 flex flex-col gap-[14px]">
          <div className="flex gap-[11px] items-start">
            <MaterialIcon name="call" size={18} color="#f97316" className="mt-0.5" />
            <div>
              <a href={PHONE_TEL} className="block text-sm text-white no-underline">
                {t('chrome.footer.phone')}
              </a>
              <div className="font-plex-mono text-[10.5px] text-advika-grey700 pt-[3px]">
                {t('chrome.footer.hours')}
              </div>
            </div>
          </div>
          <div className="flex gap-[11px] items-start">
            <MaterialIcon name="location_on" size={18} color="#f97316" className="mt-0.5" />
            <div>
              <div className="text-sm text-white">{t('chrome.footer.addressLine1')}</div>
              <div className="font-plex-mono text-[10.5px] text-advika-grey700 pt-[3px]">
                {t('chrome.footer.addressLine2')}
              </div>
            </div>
          </div>
        </div>

        {/* Legal row — plain text in the source design, not links */}
        <div className="border-t border-advika-border-1 py-4 pb-[26px] flex gap-[14px] flex-wrap font-plex-mono text-[9.5px] text-advika-grey700">
          <span>{t('chrome.footer.copyright')}</span>
          <span>{t('chrome.footer.privacy')}</span>
          <span>{t('chrome.footer.terms')}</span>
        </div>
      </div>
    </footer>
  );
}
