// src/components/Shared/SlideDownMenu.jsx
//
// Slide-down menu toggled by the header's hamburger on Landing and Cart
// (design_handoff_advika_auto/README.md "Shared: Slide-down Menu (landing,
// cart)"). Rendered by Navbar.jsx when variant="menu"; this component is
// purely presentational/controlled so Navbar owns the open/close state
// (it already owns the hamburger glyph that toggles it).
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MaterialIcon from '@/components/Shared/MaterialIcon';

const PHONE_TEL = 'tel:+919876543210';
const ROW_CLASS =
  'h-14 px-4 border-b border-advika-border-2 flex items-center gap-[13px] no-underline text-left w-full bg-transparent border-t-0 border-l-0 border-r-0';

export default function SlideDownMenu({ open, wishCount = 0, onClose, onChangeLanguage, innerRef }) {
  const { t } = useTranslation();
  if (!open) return null;

  // Order and copy match the README spec verbatim: My wishlist · My
  // profile · My orders · My cart · All categories · Change language ·
  // Help & contact.
  const rows = [
    { icon: 'favorite_border', label: t('chrome.menu.wishlist'), to: '/wishlist', badge: wishCount },
    { icon: 'person_outline', label: t('chrome.menu.profile'), to: '/profile' },
    { icon: 'receipt_long', label: t('chrome.menu.orders'), to: '/orders' },
    { icon: 'shopping_cart', label: t('chrome.menu.cart'), to: '/cart' },
    { icon: 'grid_view', label: t('chrome.menu.categories'), to: '/products' },
    { icon: 'translate', label: t('chrome.menu.language'), action: 'language' },
    { icon: 'support_agent', label: t('chrome.menu.help'), href: PHONE_TEL },
  ];

  return (
    <div
      ref={innerRef}
      // Full-bleed background, content constrained to the same 520px
      // shell as the header above it (see Navbar.jsx's header comment) —
      // otherwise these rows would span the whole viewport on a wide
      // screen while the header sitting right above them doesn't.
      className="sticky top-[60px] z-[45] bg-advika-panel border-b border-advika-border-3"
      role="menu"
    >
      <div className="max-w-[520px] mx-auto flex flex-col">
      {rows.map((row) => {
        const inner = (
          <>
            <MaterialIcon name={row.icon} size={21} color="#f97316" />
            <span className="flex-1 text-[14.5px] text-white">{row.label}</span>
            {!!row.badge && (
              <span className="min-w-[15px] h-[15px] rounded-full bg-advika-orange text-white font-plex-mono text-[8px] font-semibold px-[3px] flex items-center justify-center">
                {row.badge}
              </span>
            )}
            <MaterialIcon name="chevron_right" size={18} color="#525252" />
          </>
        );

        if (row.action === 'language') {
          return (
            <button key={row.icon} type="button" role="menuitem" onClick={onChangeLanguage} className={ROW_CLASS}>
              {inner}
            </button>
          );
        }
        if (row.href) {
          return (
            <a key={row.icon} href={row.href} role="menuitem" className={ROW_CLASS} onClick={onClose}>
              {inner}
            </a>
          );
        }
        return (
          <Link key={row.icon} to={row.to} role="menuitem" className={ROW_CLASS} onClick={onClose}>
            {inner}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
