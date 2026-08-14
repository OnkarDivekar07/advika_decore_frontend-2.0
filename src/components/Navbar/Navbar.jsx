// src/components/Navbar/Navbar.jsx
import React, { useState, useCallback, useContext, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiHome, FiHeart, FiShoppingCart, FiUser, FiSearch, FiX, FiMenu, FiLogOut, FiGrid, FiMapPin, FiPackage } from 'react-icons/fi';
import { FaTruck } from 'react-icons/fa';
import { AuthContext } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';

// Small numeric badge pinned to the top-right of a nav icon — kept as its
// own tiny component since it's rendered in three separate places below
// (desktop nav, mobile icon strip, mobile dropdown) and should look
// identical in all three. Caps the displayed count at 99+ so a large
// wishlist never breaks the circle's layout.
function NavIconBadge({ count }) {
  if (!count) return null;
  return (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center"
      aria-hidden
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const { count: wishlistCount } = useWishlist();

  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);
  const closeMenu  = useCallback(() => setMenuOpen(false), []);

  // Current page indicator for both the desktop nav and the mobile
  // dropdown — '/' only matches the home page exactly (otherwise it'd
  // stay "active" everywhere), everything else matches its own subtree
  // so e.g. /product/123 still highlights "Shop".
  const isActivePath = useCallback(
    (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)),
    [location.pathname]
  );

  // The mobile dropdown renders as a fixed overlay (see below) rather
  // than pushing page content down, so opening it shouldn't also let the
  // page scroll behind it — same lock FilterDrawer uses — and Escape
  // should close it like any other transient panel.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  // A route change (e.g. tapping a link) always closes the menu, but this
  // also catches back/forward navigation while it's open.
  useEffect(() => { closeMenu(); }, [location.pathname, closeMenu]);

  // Profile icon doubles as the login entry point when signed out — the
  // "Profile" page itself is behind auth, so send anonymous users to
  // verification instead of a page that will immediately bounce them.
  const navLinks = useMemo(() => ([
    { to: '/',         icon: <FiHome />,        label: 'Home' },
    { to: '/products', icon: <FiGrid />,         label: 'Shop' },
    { to: '/wishlist', icon: <FiHeart />,        label: 'Wishlist', badge: wishlistCount },
    { to: '/cart',     icon: <FiShoppingCart />, label: 'Cart' },
    isAuthenticated
      ? { to: '/profile',          icon: <FiUser />, label: 'Profile' }
      : { to: '/otp-verification', icon: <FiUser />, label: 'Login' },
  ]), [isAuthenticated, wishlistCount]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  // Shown only when signed in — kept out of navLinks (and therefore out
  // of the mobile icon strip, navLinks.slice(1)) so the always-visible
  // top strip doesn't get crowded on small screens; it still appears in
  // the desktop nav and the mobile dropdown below.
  const accountLinks = isAuthenticated
    ? [
        { to: '/orders', icon: <FiPackage />, label: t('orders.navLabel', 'My Orders') },
        { to: '/addresses', icon: <FiMapPin />, label: t('addresses.navLabel', 'Addresses') },
      ]
    : [];

  const handleLogout = useCallback(() => {
    logout();
    closeMenu();
    navigate('/');
  }, [logout, closeMenu, navigate]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[var(--clr-border)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">

        {/* Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-2 font-display font-extrabold text-xl md:text-2xl tracking-tight text-gray-900 hover:opacity-80 transition-opacity shrink-0"
        >
          <FaTruck className="text-red-500 text-lg md:text-xl" aria-hidden />
          <span>Advika</span>
          <span className="text-red-600">Decore</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map(({ to, icon, label, badge }) => {
            const active = isActivePath(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-[var(--clr-primary-dark)] bg-[var(--clr-primary)]/10'
                    : 'text-gray-700 hover:text-[var(--clr-primary-dark)] hover:bg-gray-50'
                }`}
              >
                <span className="relative text-base" aria-hidden>
                  {icon}
                  <NavIconBadge count={badge} />
                </span>
                {label}
              </Link>
            );
          })}
          {accountLinks.map(({ to, icon, label }) => {
            const active = isActivePath(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-[var(--clr-primary-dark)] bg-[var(--clr-primary)]/10'
                    : 'text-gray-700 hover:text-[var(--clr-primary-dark)] hover:bg-gray-50'
                }`}
              >
                <span className="text-base" aria-hidden>{icon}</span>
                {label}
              </Link>
            );
          })}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors"
            >
              <span className="text-base" aria-hidden><FiLogOut /></span>
              Logout
            </button>
          )}
        </nav>

        {/* Desktop search */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center bg-gray-100 hover:bg-gray-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary rounded-full px-3.5 py-2 gap-2 transition-all w-52"
          role="search"
        >
          <FiSearch className="text-gray-400 shrink-0" aria-hidden />
          <input
            type="search"
            placeholder={t('search.navPlaceholder', 'Search products…')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 w-full"
            aria-label={t('search.title', 'Search Products')}
          />
        </form>

        {/* Mobile: icon strip + hamburger */}
        <div className="flex md:hidden items-center gap-4">
          {navLinks.slice(1).map(({ to, icon, label, badge }) => {
            const active = isActivePath(to);
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`relative text-xl leading-none transition-colors ${
                  active ? 'text-[var(--clr-primary-dark)]' : 'text-gray-700 hover:text-red-600'
                }`}
              >
                {icon}
                <NavIconBadge count={badge} />
              </Link>
            );
          })}
          <button
            onClick={toggleMenu}
            className="p-1 -mr-1 rounded-md text-xl leading-none text-gray-700 hover:text-red-600 transition-colors"
            aria-label={menuOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — a fixed overlay rather than an inline block,
          so opening/closing it never shifts the page content underneath
          (the old inline-flow version pushed everything below the header
          down by the dropdown's height). Body scroll is locked and
          Escape closes it while open — see the effect above. */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={t('nav.mainMenu', 'Main menu')}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 animate-fade-up" onClick={closeMenu} aria-hidden />

          {/* Panel — pinned just below the sticky header, scrolls on its
              own if content ever exceeds the viewport height. */}
          <div className="absolute inset-x-0 top-16 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white border-t border-[var(--clr-border)] shadow-lg px-4 py-4 space-y-1 animate-fade-up">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-3.5 py-2 gap-2 mb-3" role="search">
              <FiSearch className="text-gray-400 shrink-0" aria-hidden />
              <input
                type="search"
                placeholder={t('search.navPlaceholder', 'Search products…')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 w-full"
                aria-label={t('search.title', 'Search Products')}
              />
            </form>
            {navLinks.map(({ to, icon, label, badge }) => {
              const active = isActivePath(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-2 py-3 rounded-lg text-base font-medium transition-colors ${
                    active
                      ? 'text-[var(--clr-primary-dark)] bg-[var(--clr-primary)]/10'
                      : 'text-gray-700 hover:text-[var(--clr-primary-dark)] hover:bg-gray-50'
                  }`}
                >
                  <span className="relative text-lg" aria-hidden>
                    {icon}
                    <NavIconBadge count={badge} />
                  </span>
                  {label}
                </Link>
              );
            })}
            {accountLinks.map(({ to, icon, label }) => {
              const active = isActivePath(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-2 py-3 rounded-lg text-base font-medium transition-colors ${
                    active
                      ? 'text-[var(--clr-primary-dark)] bg-[var(--clr-primary)]/10'
                      : 'text-gray-700 hover:text-[var(--clr-primary-dark)] hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg" aria-hidden>{icon}</span>
                  {label}
                </Link>
              );
            })}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg" aria-hidden><FiLogOut /></span>
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
