// src/components/Layout/SlideMenu.jsx
//
// Slide-down menu toggled by the header hamburger on Landing and Cart —
// see design_handoff_advika_auto/README.md "Shared: Slide-down Menu".
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useWishlist } from '@/contexts/WishlistContext';
import LanguageModal from '@/components/Layout/LanguageModal';
import { BRAND_PHONE_TEL } from '@/config/advikaAuto';

function Row({ to, href, icon, label, badge, onClick }) {
  const content = (
    <>
      <Icon name={icon} size={21} className="text-advika-orange" />
      <span className="flex-1 text-[14.5px] text-white">{label}</span>
      {!!badge && (
        <span className="aa-mono flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-advika-orange px-[3px] text-[8px] font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <Icon name="chevron_right" size={18} className="text-advika-grey600" />
    </>
  );
  const className = 'flex h-14 items-center gap-[13px] border-b border-[#2e2e2e] px-4';
  if (href) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={className} onClick={onClick}>
      {content}
    </Link>
  );
}

export default function SlideMenu({ open, onClose }) {
  const { t } = useTranslation();
  const { count: wishlistCount } = useWishlist();
  const [langModalOpen, setLangModalOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      {/* This is a plain slide-down list of navigation links and buttons,
          not a widget — it deliberately does NOT use role="menu" (which
          would promise arrow-key navigation and a focus trap that aren't
          implemented here). A <nav> landmark describes what it actually
          is: a secondary navigation region, tabbable in normal document
          order like any other links/buttons on the page. */}
      <nav
        aria-label={t('advika.menu.label', 'Menu')}
        className="sticky top-[60px] z-[45] flex flex-col border-b border-[#333] bg-advika-panel"
      >
        <Row to="/wishlist" icon="favorite_border" label={t('advika.menu.wishlist', 'My wishlist')} badge={wishlistCount} onClick={onClose} />
        <Row to="/profile" icon="person_outline" label={t('advika.menu.profile', 'My profile')} onClick={onClose} />
        <Row to="/profile?tab=orders" icon="receipt_long" label={t('advika.menu.orders', 'My orders')} onClick={onClose} />
        <Row to="/cart" icon="shopping_cart" label={t('advika.menu.cart', 'My cart')} onClick={onClose} />
        <Row to="/products" icon="grid_view" label={t('advika.menu.categories', 'All categories')} onClick={onClose} />
        <button
          type="button"
          onClick={() => setLangModalOpen(true)}
          className="flex h-14 items-center gap-[13px] border-b border-[#2e2e2e] px-4 text-left"
        >
          <Icon name="translate" size={21} className="text-advika-orange" />
          <span className="flex-1 text-[14.5px] text-white">{t('advika.menu.language', 'Change language')}</span>
          <Icon name="chevron_right" size={18} className="text-advika-grey600" />
        </button>
        <Row href={BRAND_PHONE_TEL} icon="support_agent" label={t('advika.menu.help', 'Help & contact')} onClick={onClose} />
      </nav>
      <LanguageModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </>
  );
}
