# Advika E-Commerce — Frontend (frontend-improved)

Customer-facing storefront for the Advika e-commerce platform. Built with **React 19 + Vite + Tailwind CSS**.

---

## 1. Tech Stack

| Layer            | Technology                                   |
|------------------|-----------------------------------------------|
| Framework        | React 19                                       |
| Build tool       | Vite 5                                         |
| Styling          | Tailwind CSS 3                                 |
| Routing          | react-router-dom v6                            |
| HTTP client      | axios                                          |
| Icons            | lucide-react, react-icons, Font Awesome        |
| Carousel         | react-slick + slick-carousel (hero banners)    |
| Notifications    | react-toastify                                 |
| i18n             | react-i18next (English, Hindi, Marathi)        |
| Linting/Format   | ESLint + Prettier                              |

---

## 2. Project Structure

```
frontend-improved/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx                 # App entry point
│   ├── App.jsx                  # Root component (Router, Language provider, Toasts)
│   ├── routes/AppRoutes.jsx     # All route definitions (lazy-loaded pages)
│   ├── pages/                   # Route-level pages
│   │   ├── Home/HomePage.jsx
│   │   ├── ProductDetail/ProductDetailPage.jsx
│   │   ├── Cart/CartPage.jsx
│   │   └── NotFound.jsx
│   │   # (Checkout, Payment, OTPVerification, UserProfile, AddressSelection,
│   │   #  OrderSuccess folders exist and are scaffolded for upcoming pages)
│   ├── components/
│   │   ├── HeroBanner/          # Home page hero carousel
│   │   ├── Product/             # ProductCard, ImageGallery, RelatedProducts, etc.
│   │   ├── Cart/                # CartItem, CartSummary
│   │   ├── Navbar/               # Site navigation
│   │   └── Shared/               # Spinner, ErrorBoundary, LanguageSelectorModal, etc.
│   ├── features/                 # Feature-scoped logic (auth, cart, orders, products, address)
│   ├── services/                 # API service layer (products, banners, cart, orders, auth, address)
│   ├── contexts/LanguageContext.jsx
│   ├── hooks/                    # useHeroBanners, useLanguageGate
│   ├── i18n/                     # en.json, hi.json, mr.json translation files
│   └── utils/                    # apiClient, env, error handling, constants
```

---

## 3. Prerequisites

- Node.js 18+ and npm
- The backend API running and reachable (see `backend 2.0` README)

---

## 4. Environment Variables

Create a `.env` file in `frontend-improved/`:

```env
VITE_API_URL=http://localhost:5000
```

This is the base URL the frontend uses to call the backend API (see `src/utils/env.js` / `src/services/api.js`). Update it to point at your deployed backend URL in production.

---

## 5. Installation & Running Locally

```bash
cd frontend-improved

# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

By default Vite serves the app at `http://localhost:5173` (check terminal output for the exact port).

---

## 6. NPM Scripts

| Script               | Description                                            |
|-----------------------|----------------------------------------------------------|
| `npm run dev`          | Starts the Vite development server with HMR             |
| `npm run build`        | Builds an optimized production bundle to `dist/`         |
| `npm run preview`      | Serves the production build locally for a final check    |
| `npm run lint`         | Runs ESLint across the project                            |
| `npm run format`       | Formats the codebase with Prettier                         |
| `npm run build:analyze`| Builds and generates a bundle-size visualization report   |

---

## 7. Key Features

- **Home page** with hero banner carousel, category grid, and new-arrivals section, all fed from the backend `homepage` API.
- **Product listing / detail** pages with image gallery, quantity selector, and related products.
- **Cart** with add/update/remove and running total (`CartItem`, `CartSummary`).
- **Multi-language support** (English / Hindi / Marathi) via `react-i18next`, with a language-selector modal and a `useLanguageGate` hook.
- **Toast notifications** for user feedback (success/error) via `react-toastify`.
- **Error boundary** around the app to gracefully catch render errors.

> Routes for Checkout, Payment, OTP verification, User Profile, Address Selection, and Order Success are scaffolded (empty folders under `src/pages/`) but not yet wired into `AppRoutes.jsx` — they are commented out pending implementation.

---

## 8. Building for Production

```bash
npm run build
```

This outputs a static bundle to `dist/`, which can be deployed to any static host (Netlify, Vercel, S3 + CloudFront, Nginx, etc.). Make sure `VITE_API_URL` is set to the production backend URL **before** running the build, since Vite inlines env variables at build time.

---

## 9. Notes

- Path alias `@` maps to `src/` (see `vite.config.js`) — used throughout imports (e.g. `@/components/Shared/Spinner`).
- Tailwind is configured via `tailwind.config.js` / `postcss.config.cjs`.
- `.env` and `.env.local` files are git-ignored — never commit real API URLs/secrets if they differ per environment.
