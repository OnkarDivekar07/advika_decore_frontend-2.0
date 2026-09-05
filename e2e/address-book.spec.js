// e2e/address-book.spec.js — /addresses (AddressBookPage, AddressForm,
// AddressCard, useAddressBook). Full add/edit/delete/set-default CRUD,
// client-side validation, and the signed-out redirect guard.
import { test, expect } from '@playwright/test';
import { installDefaultMocks, loginAs } from './support/mockApi.js';
import { ADDRESS_1, EXPIRED_TOKEN } from './fixtures/data.js';

test.describe('Address book — signed out', () => {
  test('visiting /addresses while signed out redirects home', async ({ page }) => {
    await installDefaultMocks(page);
    await page.goto('/addresses');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  // authUtils.js's getToken() self-clears an already-expired token and
  // returns null — an expired token in storage must be treated exactly
  // like no token at all, not like a broken-but-authenticated state.
  test('visiting /addresses with an expired token in storage redirects home, same as signed out', async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page, { token: EXPIRED_TOKEN });
    await page.goto('/addresses');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    const token = await page.evaluate(() => window.sessionStorage.getItem('authToken'));
    expect(token).toBeFalsy();
  });
});

test.describe('Address book — signed in', () => {
  test.beforeEach(async ({ page }) => {
    await installDefaultMocks(page);
    await loginAs(page);
  });

  test('shows the seeded default address', async ({ page }) => {
    await page.goto('/addresses');
    await expect(page.getByTestId(`address-card-${ADDRESS_1.id}`)).toBeVisible({ timeout: 10000 });
  });

  test('creates a new address, which then appears in the list', async ({ page }) => {
    await page.goto('/addresses');
    await expect(page.getByTestId(`address-card-${ADDRESS_1.id}`)).toBeVisible({ timeout: 10000 });

    await page.getByTestId('address-book-add-new-button').click();
    await page.getByTestId('address-form-name-input').fill('Suresh Patil');
    await page.getByTestId('address-form-phone-input').fill('9876500001');
    await page.getByTestId('address-form-pincode-input').fill('411001');
    await page.getByTestId('address-form-city-input').fill('Pune');
    await page.getByTestId('address-form-house-area-input').fill('42, MG Road');
    await page.getByTestId('address-form-area-input').fill('Camp');
    await page.getByTestId('address-form-state-input').fill('Maharashtra');
    await page.getByTestId('address-form-submit-button').click();

    // The new address is created with id addr_2 by the mock (see
    // mockApi.js's POST /api/user/address handler: `addr_${addresses.length + 1}`).
    await expect(page.getByTestId('address-card-addr_2')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('address-card-addr_2')).toContainText('Suresh Patil');
  });

  test('edits an existing address and the change is reflected in the card', async ({ page }) => {
    await page.goto('/addresses');
    await expect(page.getByTestId(`address-card-${ADDRESS_1.id}`)).toBeVisible({ timeout: 10000 });

    await page.getByTestId(`address-card-edit-${ADDRESS_1.id}`).click();
    await expect(page.getByTestId('address-form-name-input')).toBeVisible();
    await page.getByTestId('address-form-name-input').fill('Updated Name');
    await page.getByTestId('address-form-submit-button').click();

    await expect(page.getByTestId(`address-card-${ADDRESS_1.id}`)).toContainText('Updated Name', { timeout: 10000 });
  });

  test('deletes an address, which then disappears from the list', async ({ page }) => {
    // Start from two addresses (the seeded default + a freshly-added one,
    // via the default mock's POST handler — see mockApi.js) so deleting
    // one leaves a real, still-populated list to assert against rather
    // than falling into the empty state.
    await page.goto('/addresses');
    await page.getByTestId('address-book-add-new-button').click();
    await page.getByTestId('address-form-name-input').fill('Second Address');
    await page.getByTestId('address-form-phone-input').fill('9876500002');
    await page.getByTestId('address-form-pincode-input').fill('110001');
    await page.getByTestId('address-form-city-input').fill('Delhi');
    await page.getByTestId('address-form-house-area-input').fill('1, Connaught Place');
    await page.getByTestId('address-form-area-input').fill('CP');
    await page.getByTestId('address-form-state-input').fill('Delhi');
    await page.getByTestId('address-form-submit-button').click();
    await expect(page.getByTestId('address-card-addr_2')).toBeVisible({ timeout: 10000 });

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('address-card-delete-addr_2').click();

    await expect(page.getByTestId('address-card-addr_2')).not.toBeVisible({ timeout: 10000 });
    // The other (default) address is untouched.
    await expect(page.getByTestId(`address-card-${ADDRESS_1.id}`)).toBeVisible();
  });

  test('setting a non-default address as default moves the default flag', async ({ page }) => {
    await page.goto('/addresses');
    await page.getByTestId('address-book-add-new-button').click();
    await page.getByTestId('address-form-name-input').fill('Second Address');
    await page.getByTestId('address-form-phone-input').fill('9876500002');
    await page.getByTestId('address-form-pincode-input').fill('110001');
    await page.getByTestId('address-form-city-input').fill('Delhi');
    await page.getByTestId('address-form-house-area-input').fill('1, Connaught Place');
    await page.getByTestId('address-form-area-input').fill('CP');
    await page.getByTestId('address-form-state-input').fill('Delhi');
    await page.getByTestId('address-form-submit-button').click();
    await expect(page.getByTestId('address-card-addr_2')).toBeVisible({ timeout: 10000 });

    // Only a non-default address renders a "set as default" affordance.
    await expect(page.getByTestId('address-card-set-default-addr_2')).toBeVisible();
    await page.getByTestId('address-card-set-default-addr_2').click();

    // Once addr_2 is default, its own "set as default" button disappears
    // (AddressCard only renders it for `!address.isDefault`) — and the
    // previously-default seeded address gets one instead.
    await expect(page.getByTestId('address-card-set-default-addr_2')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`address-card-set-default-${ADDRESS_1.id}`)).toBeVisible();
  });

  test('rejects an invalid phone number and pincode with client-side validation', async ({ page }) => {
    await page.goto('/addresses');
    await page.getByTestId('address-book-add-new-button').click();

    await page.getByTestId('address-form-name-input').fill('Bad Data');
    // First digit 5 is not a valid Indian mobile prefix (6-9 only) — see
    // phoneValidation.js's INDIAN_MOBILE_LOCAL_REGEX.
    await page.getByTestId('address-form-phone-input').fill('5123456789');
    // Leading 0 is not a valid Indian postal zone — see
    // pincodeValidation.js's PINCODE_REGEX.
    await page.getByTestId('address-form-pincode-input').fill('000000');
    await page.getByTestId('address-form-city-input').fill('Pune');
    await page.getByTestId('address-form-house-area-input').fill('42, MG Road');
    await page.getByTestId('address-form-area-input').fill('Camp');
    await page.getByTestId('address-form-state-input').fill('Maharashtra');
    await page.getByTestId('address-form-submit-button').click();

    await expect(page.getByTestId('address-form-phone-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('address-form-pincode-input')).toHaveAttribute('aria-invalid', 'true');
    // Never submitted — the form is still open, not a newly created card.
    await expect(page.getByTestId('address-form-name-input')).toBeVisible();
  });
});
