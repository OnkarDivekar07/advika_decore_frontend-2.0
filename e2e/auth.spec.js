// e2e/auth.spec.js — Login / OTP flow (src/pages/Login/LoginPage.jsx)
import { test, expect } from '@playwright/test';
import { installDefaultMocks, API_BASE } from './support/mockApi.js';

test.describe('Authentication — phone + OTP login', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
  });

  test('happy path: send OTP, verify with correct code, reach success screen', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-phone-input').fill('9876543210');
    await expect(page.getByTestId('login-send-otp-button')).toBeEnabled();
    await page.getByTestId('login-send-otp-button').click();

    // Moves to the OTP step
    await expect(page.getByTestId('login-otp-hidden-input')).toBeVisible();

    await page.getByTestId('login-otp-hidden-input').fill('123456');
    await expect(page.getByTestId('login-verify-button')).toBeEnabled();
    await page.getByTestId('login-verify-button').click();

    // LoginPage's "new user?" checkbox defaults to checked (isNewUser
    // useState(true)), so a successful verify always lands on the
    // complete-your-profile step first, regardless of whether this
    // particular phone number is actually new — "Skip for now" is the
    // fastest legitimate path through to success from here.
    await expect(page.getByTestId('login-fullname-input')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('login-skip-button').click();
    await expect(page.getByTestId('login-start-shopping-button')).toBeVisible();

    // Session was actually persisted, not just a UI transition.
    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    expect(token).toBeTruthy();
  });

  test('rejects an invalid OTP with an error and does not persist a session', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('9876543210');
    await page.getByTestId('login-send-otp-button').click();
    await expect(page.getByTestId('login-otp-hidden-input')).toBeVisible();

    await page.getByTestId('login-otp-hidden-input').fill('000000');
    await page.getByTestId('login-verify-button').click();

    // Stays on the OTP step — never reaches success.
    await expect(page.getByTestId('login-start-shopping-button')).not.toBeVisible();
    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    expect(token).toBeFalsy();
  });

  test('send-OTP button is disabled for an incomplete phone number', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('987');
    await expect(page.getByTestId('login-send-otp-button')).toBeDisabled();
  });

  test('surfaces a backend error when send-otp fails (e.g. rate limited)', async ({ page }) => {
    await page.route(`${API_BASE}/api/otp/send-otp`, (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Too many OTP requests. Please try again later.', errors: null }),
      })
    );
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('9876543210');
    await page.getByTestId('login-send-otp-button').click();

    // Should not silently proceed to the OTP step on a failed send.
    await expect(page.getByTestId('login-otp-hidden-input')).not.toBeVisible();
  });

  test('"Change number" returns to the phone step', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('9876543210');
    await page.getByTestId('login-send-otp-button').click();
    await expect(page.getByTestId('login-otp-hidden-input')).toBeVisible();

    await page.getByTestId('login-change-number-button').click();
    await expect(page.getByTestId('login-phone-input')).toBeVisible();
  });

  test('completing profile as a new user persists name + vehicle via PATCH /api/user/profile', async ({ page }) => {
    let patchBody = null;
    await page.route(`${API_BASE}/api/user/profile`, async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBody = route.request().postDataJSON();
      }
      return route.fallback();
    });

    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('9876543210');
    await page.getByTestId('login-send-otp-button').click();
    await expect(page.getByTestId('login-otp-hidden-input')).toBeVisible();
    // "New user?" is already checked by default — this just documents
    // that intent explicitly rather than relying on the default.
    await expect(page.getByTestId('login-new-user-checkbox')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('login-otp-hidden-input').fill('123456');
    await page.getByTestId('login-verify-button').click();

    await expect(page.getByTestId('login-fullname-input')).toBeVisible();
    await page.getByTestId('login-fullname-input').fill('Ramesh Kumar');
    await page.getByTestId('vehicle-option-truck').click();
    await page.getByTestId('login-create-account-button').click();

    await expect(page.getByTestId('login-start-shopping-button')).toBeVisible();
    expect(patchBody).toMatchObject({ name: 'Ramesh Kumar', vehicle: 'Truck' });
  });

  test('session survives a page reload (sessionStorage-backed)', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-phone-input').fill('9876543210');
    await page.getByTestId('login-send-otp-button').click();
    await page.getByTestId('login-otp-hidden-input').fill('123456');
    await page.getByTestId('login-verify-button').click();
    await expect(page.getByTestId('login-fullname-input')).toBeVisible();
    await page.getByTestId('login-skip-button').click();
    await expect(page.getByTestId('login-start-shopping-button')).toBeVisible();

    await page.getByTestId('login-start-shopping-button').click();
    await page.reload({ waitUntil: 'domcontentloaded' });

    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    expect(token).toBeTruthy();
  });
});
