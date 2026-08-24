// src/components/Layout/AdvikaHeader.jsx
//
// Shared sticky header — see design_handoff_advika_auto/README.md
// "Shared: Top Header (all 10 screens)". Rendered at the top of every
// page. `variant="hamburger"` (landing, cart) shows a hamburger that
// toggles the slide-down menu instead of the account icon.
import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Shared/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { LanguageContext } from '@/contexts/LanguageContext';

function Badge({ count }) {
  if (!count) return null;
  return (
    <span
      className="aa-mono absolute right-px top-px flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-advika-orange px-[3px] text-[8px] font-semibold text-white"
      aria-hidden
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

const LANG_SEGMENTS = [
  { code: 'en', key: 'advika.header.langEn' },
  { code: 'hi', key: 'advika.header.langHi' },
  { code: 'mr', key: 'advika.header.langMr' },
];

export default function AdvikaHeader({ variant = 'account', menuOpen, onToggleMenu }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const isHome = location.pathname === '/';
  // README: Account.dc.html and Wishlist.dc.html each omit the header
  // icon for whichever screen you're currently on (no redundant
  // "you are here" icon, and no self-referential badge on Wishlist).
  const isWishlistPage = location.pathname === '/wishlist';
  const isAccountPage = location.pathname === '/profile';

  const goAccount = useCallback(() => {
    navigate(isAuthenticated ? '/profile' : '/login');
  }, [isAuthenticated, navigate]);

  return (
    <LanguageContext.Consumer>
      {({ language, changeLanguage }) => (
        <>
          {/* Skip link — first focusable element on every AdvikaHeader page.
              Hidden until it receives keyboard focus, then jumps a
              keyboard/screen-reader user straight past the repeated
              header/nav to the page's main content (targets the
              `id="main-content"` most page <main> elements already carry).
              Same pattern as the legacy Navbar's own skip link. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline focus:outline-2 focus:outline-advika-orange"
          >
            {t('nav.skipToContent', 'Skip to main content')}
          </a>
          <header
            className="sticky top-0 z-50 flex items-center justify-between gap-1 border-b border-advika-border-dark bg-advika-chrome px-[10px] py-[11px]"
          >
          {/* Logo lockup */}
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={t('common.home', 'Home')}>
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[6px] bg-advika-orange">
              <Icon name="bolt" className="text-white" size={21} />
            </span>
            <span className="font-archivoBlack whitespace-nowrap text-[15px] tracking-[.01em] text-white">
              {t('advika.brand.name', 'ADVIKA AUTO')}
            </span>
          </Link>

          {/* Action cluster */}
          <div className="flex shrink-0 items-center gap-[2px]">
            {/* Language switcher */}
            <div className="mr-[3px] flex overflow-hidden rounded border border-advika-border-dark4">
              {LANG_SEGMENTS.map((seg) => (
                <button
                  key={seg.code}
                  type="button"
                  onClick={() => changeLanguage(seg.code)}
                  aria-pressed={language === seg.code}
                  className={`aa-mono flex h-[34px] min-w-[30px] items-center justify-center px-1 text-[10.5px] font-semibold transition-colors ${
                    language === seg.code ? 'bg-advika-orange text-white' : 'text-advika-grey600'
                  }`}
                >
                  {t(seg.key)}
                </button>
              ))}
            </div>

            <Link
              to="/"
              aria-label={t('common.home', 'Home')}
              className="flex h-[38px] w-[38px] items-center justify-center"
            >
              <Icon name="home" size={22} className={isHome ? 'text-advika-orange' : 'text-[#e5e5e5]'} />
            </Link>
            {!isWishlistPage && (
              <Link
                to="/wishlist"
                aria-label={t('nav.wishlist', 'Wishlist')}
                className="relative flex h-[38px] w-[38px] items-center justify-center"
              >
                <Icon name="favorite_border" size={22} className="text-[#e5e5e5]" />
                <Badge count={wishlistCount} />
              </Link>
            )}
            <Link
              to="/cart"
              aria-label={t('nav.cart', 'Cart')}
              className="relative flex h-[38px] w-[38px] items-center justify-center"
            >
              <Icon name="shopping_cart" size={22} className="text-[#e5e5e5]" />
              <Badge count={itemCount} />
            </Link>

            {variant === 'hamburger' ? (
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label={menuOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
                aria-expanded={menuOpen}
                className="flex h-[38px] w-[38px] items-center justify-center"
              >
                <Icon name={menuOpen ? 'close' : 'menu'} size={24} className="text-white" />
              </button>
            ) : (
              !isAccountPage && (
                <button
                  type="button"
                  onClick={goAccount}
                  aria-label={t('nav.account', 'Account')}
                  className="flex h-[38px] w-[38px] items-center justify-center"
                >
                  <Icon name="person_outline" size={22} className="text-[#e5e5e5]" />
                </button>
              )
            )}
          </div>
          </header>
        </>
      )}
    </LanguageContext.Consumer>
  );
}
