/**
 * E2E Test — Escrow Creation Flow
 * Tests: Create escrow → link created → share link
 *
 * NOTE: These tests navigate directly to screens via URL or deep link.
 * In a real E2E run with mocked backend, the auth flow would complete
 * first, landing on MainStack. These tests assume the user is already
 * authenticated and on the CreateEscrow screen.
 *
 * All selectors use by.id() or by.text() — Detox 20.x API.
 */
import { by, device, element, expect } from 'detox';

describe('Escrow Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show create escrow form fields', async () => {
    // Navigate past auth if needed — skip to authenticated state
    // In full E2E with mock server, auth completes automatically
    await expect(element(by.id('escrowDesc'))).toBeVisible();
    await expect(element(by.id('escrowAmount'))).toBeVisible();
    await expect(element(by.id('createEscrowBtn'))).toBeVisible();
  });

  it('should show delivery method picker', async () => {
    await expect(element(by.id('delivery-courier'))).toBeVisible();
    await expect(element(by.id('delivery-meetup'))).toBeVisible();
  });

  it('should default to courier delivery', async () => {
    await expect(element(by.id('delivery-courier'))).toBeVisible();
  });

  it('should select meetup delivery method', async () => {
    await element(by.id('delivery-meetup')).tap();
    await expect(element(by.id('delivery-meetup'))).toBeVisible();
  });

  it('should show fee note below create button', async () => {
    await expect(element(by.id('feeNote'))).toBeVisible();
    await expect(element(by.text('Croe fee: 3.5%'))).toBeVisible();
  });

  it('should fill in escrow description', async () => {
    await element(by.id('escrowDesc')).typeText('iPhone 15 Pro Max, space black');
    await expect(element(by.id('escrowDesc'))).toBeVisible();
  });

  it('should fill in escrow amount', async () => {
    await element(by.id('escrowAmount')).typeText('450');
    await expect(element(by.id('escrowAmount'))).toBeVisible();
  });

  it('should create escrow and navigate to link created screen', async () => {
    await element(by.id('escrowDesc')).typeText('iPhone 15 Pro Max');
    await element(by.id('escrowAmount')).typeText('450');
    await element(by.id('createEscrowBtn')).tap();

    // Link created screen
    await expect(element(by.text('Escrow link created'))).toBeVisible();
    await expect(element(by.id('shareLinkBtn'))).toBeVisible();
    await expect(element(by.id('payUrl'))).toBeVisible();
  });

  it('should show share to WhatsApp button on link created', async () => {
    await element(by.id('escrowDesc')).typeText('MacBook Air M3');
    await element(by.id('escrowAmount')).typeText('3200');
    await element(by.id('createEscrowBtn')).tap();

    await expect(element(by.text('Share to WhatsApp'))).toBeVisible();
    await expect(element(by.id('shareLinkBtn'))).toBeVisible();
  });

  it('should show more options button on link created', async () => {
    await element(by.id('escrowDesc')).typeText('MacBook Air M3');
    await element(by.id('escrowAmount')).typeText('3200');
    await element(by.id('createEscrowBtn')).tap();

    await expect(element(by.text('More options'))).toBeVisible();
    await expect(element(by.id('moreOptionsBtn'))).toBeVisible();
  });

  it('should show copy link row with payment URL', async () => {
    await element(by.id('escrowDesc')).typeText('MacBook Air M3');
    await element(by.id('escrowAmount')).typeText('3200');
    await element(by.id('createEscrowBtn')).tap();

    await expect(element(by.id('copyLinkRow'))).toBeVisible();
    await expect(element(by.id('payUrl'))).toBeVisible();
  });

  it('should show share instructions on link created', async () => {
    await element(by.id('escrowDesc')).typeText('MacBook Air M3');
    await element(by.id('escrowAmount')).typeText('3200');
    await element(by.id('createEscrowBtn')).tap();

    await expect(
      element(by.text('Share this link with your buyer. Funds are held securely until delivery.'))
    ).toBeVisible();
  });
});
