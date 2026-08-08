// src/components/Navbar/Navbar.jsx
import React, { useState, useCallback, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiHeart, FiShoppingCart, FiUser, FiSearch, FiX, FiMenu, FiLogOut } from 'react-icons/fi';
import { FaTruck } from 'react-icons/fa';
import { AuthContext } from '@/contexts/AuthContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(AuthContext);

  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);
  const closeMenu  = useCallback(() => setMenuOpen(false), []);

  // Profile icon doubles as the login entry point when signed out — the
  // "Profile" page itself is behind auth, so send anonymous users to
  // verification instead of a page that will immediately bounce them.
  const navLinks = useMemo(() => ([
    { to: '/',         icon: <FiHome />,        label: 'Home' },
    { to: '/wishlist', icon: <FiHeart />,        label: 'Wishlist' },
    { to: '/cart',     icon: <FiShoppingCart />, label: 'Cart' },
    isAuthenticated
      ? { to: '/profile',          icon: <FiUser />, label: 'Profile' }
      : { to: '/otp-verification', icon: <FiUser />, label: 'Login' },
  ]), [isAuthenticated]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

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
          {navLinks.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-[var(--clr-primary-dark)] hover:bg-gray-50 transition-colors"
            >
              <span className="text-base" aria-hidden>{icon}</span>
              {label}
            </Link>
          ))}
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
            placeholder="Search products…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 w-full"
            aria-label="Search products"
          />
        </form>

        {/* Mobile: icon strip + hamburger */}
        <div className="flex md:hidden items-center gap-3 text-xl text-gray-700">
          {navLinks.slice(1).map(({ to, icon, label }) => (
            <Link key={to} to={to} aria-label={label} className="hover:text-red-600 transition-colors">
              {icon}
            </Link>
          ))}
          <button
            onClick={toggleMenu}
            className="p-1 rounded-md hover:text-red-600 transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[var(--clr-border)] px-4 py-4 space-y-1 animate-fade-up">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-3.5 py-2 gap-2 mb-3" role="search">
            <FiSearch className="text-gray-400 shrink-0" aria-hidden />
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 w-full"
              aria-label="Search products"
            />
          </form>
          {navLinks.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMenu}
              className="flex items-center gap-3 px-2 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-[var(--clr-primary-dark)] hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg" aria-hidden>{icon}</span>
              {label}
            </Link>
          ))}
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
      )}
    </header>
  );
}
