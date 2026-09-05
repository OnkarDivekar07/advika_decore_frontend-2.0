// src/components/Product/__tests__/AdvikaProductCard.test.jsx
//
// Pattern 22 (performance): AdvikaProductCard is the card actually used in
// every real product grid (Landing, Category, Vehicle, Wishlist, "you may
// also like") yet, unlike its siblings ProductCard/CartItem/WishlistCard,
// was never wrapped in React.memo — so every re-render of a listing page's
// parent state (e.g. a filter, a sibling card's own local "added to cart"
// state) re-rendered every card in the grid, not just the one whose props
// actually changed. This proves a card with unchanged props skips
// re-rendering when something unrelated changes elsewhere in the tree.
//
// Detection method: `isWishlisted` is only invoked from inside the
// component's render body (`const wishlisted = isWishlisted(product.id)`),
// so counting its calls tracks actual render-function executions — unlike
// wrapping the card in a <Profiler>, whose onRender fires once per commit
// that reaches its position in the tree regardless of whether the child
// itself bailed out via memo, which would not distinguish the two cases.
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n/index'; // initializes the default i18next instance react-i18next falls back to

const isWishlisted = vi.fn(() => false);
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('@/contexts/WishlistContext', () => ({
  useWishlist: () => ({ isWishlisted, toggle: vi.fn().mockResolvedValue(undefined) }),
}));

import AdvikaProductCard from '@/components/Product/AdvikaProductCard';

const product = { id: 'p1', name: 'Test Battery', price: 1999, images: [], stock: 5 };

function Harness() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>bump {count}</button>
      <AdvikaProductCard product={product} />
    </div>
  );
}

describe('AdvikaProductCard', () => {
  it('does not re-render when an unrelated ancestor state changes and its own props are unchanged', async () => {
    const user = userEvent.setup();
    isWishlisted.mockClear();

    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    );
    expect(isWishlisted).toHaveBeenCalledTimes(1); // initial mount actually renders the card

    const button = screen.getByRole('button', { name: /bump/i });
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // Harness re-rendered 3 more times (button label updates each click),
    // but the card's own props never changed, so a memoized card should
    // not have executed its render body again.
    expect(isWishlisted).toHaveBeenCalledTimes(1);
  });
});
