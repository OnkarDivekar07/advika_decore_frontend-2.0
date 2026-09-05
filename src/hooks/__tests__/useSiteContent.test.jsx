// src/hooks/__tests__/useSiteContent.test.js
//
// Pattern 22 (performance/caching): useSiteContent backs AdvikaFooter,
// HomePage, and (transitively, via useBrandPhone) WhatsAppStrip, StickyBar,
// SlideMenu and every page that renders a click-to-call link. Each of
// those previously called it with its own independent effect and no
// shared cache, so mounting several of them together (as a real page does
// — e.g. HomePage renders both its own useSiteContent call and the
// AdvikaFooter, which also calls it) fired one GET /api/content per
// consumer instead of once per page. This test proves the request is
// deduplicated across concurrently-mounted consumers and reused (no
// re-fetch) by a consumer mounted later in the same session.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const fetchSiteContent = vi.fn();
vi.mock('@/services/contentService', () => ({
  fetchSiteContent: (...args) => fetchSiteContent(...args),
}));

const ROWS = [{ key: 'brand.phone', valueEn: '+911234567890', valueHi: '+911234567890', valueMr: '+911234567890' }];

beforeEach(() => {
  vi.resetModules();
  fetchSiteContent.mockReset();
  fetchSiteContent.mockResolvedValue(ROWS);
});

function Consumer({ useSiteContent, testId }) {
  const { getText } = useSiteContent();
  return <div data-testid={testId}>{getText('brand.phone', 'en', 'fallback')}</div>;
}

describe('useSiteContent', () => {
  it('dedupes concurrent fetches when multiple consumers mount on the same page', async () => {
    const { useSiteContent } = await import('@/hooks/useSiteContent');
    const { getByTestId } = render(
      <>
        <Consumer useSiteContent={useSiteContent} testId="a" />
        <Consumer useSiteContent={useSiteContent} testId="b" />
        <Consumer useSiteContent={useSiteContent} testId="c" />
      </>
    );

    await waitFor(() => expect(getByTestId('a').textContent).toBe('+911234567890'));
    expect(getByTestId('b').textContent).toBe('+911234567890');
    expect(getByTestId('c').textContent).toBe('+911234567890');
    expect(fetchSiteContent).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached result for a consumer mounted after the first has already loaded', async () => {
    const { useSiteContent } = await import('@/hooks/useSiteContent');
    const first = render(<Consumer useSiteContent={useSiteContent} testId="first" />);
    await waitFor(() => expect(first.getByTestId('first').textContent).toBe('+911234567890'));

    const second = render(<Consumer useSiteContent={useSiteContent} testId="second" />);
    expect(second.getByTestId('second').textContent).toBe('+911234567890');
    expect(fetchSiteContent).toHaveBeenCalledTimes(1);
  });

  it('falls back to the caller-provided static text when the fetch fails', async () => {
    fetchSiteContent.mockResolvedValue([]);
    const { useSiteContent } = await import('@/hooks/useSiteContent');
    const { getByTestId } = render(<Consumer useSiteContent={useSiteContent} testId="fallback" />);

    await waitFor(() => expect(getByTestId('fallback').textContent).toBe('fallback'));
  });
});
