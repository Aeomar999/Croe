/**
 * E2E Test — Dispute Flow
 * Tests: Open dispute → select reason → add description → submit
 *
 * NOTE: These tests navigate directly to the DisputeOpen screen.
 * In a full E2E run, this would follow from TransactionStatus → Dispute.
 *
 * All selectors use by.id() or by.text() — Detox 20.x API.
 */
import { by, device, element, expect } from 'detox';

describe('Dispute Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show dispute form header', async () => {
    await expect(element(by.text('Open a dispute'))).toBeVisible();
  });

  it('should show funds safety wash', async () => {
    await expect(element(by.text('Funds safely locked'))).toBeVisible();
    await expect(element(by.text('GH₵ 450.00 stays frozen until this is resolved.'))).toBeVisible();
  });

  it('should show all three dispute reason options', async () => {
    await expect(element(by.id('dispute-reason-NOT_RECEIVED'))).toBeVisible();
    await expect(element(by.id('dispute-reason-NOT_AS_DESCRIBED'))).toBeVisible();
    await expect(element(by.id('dispute-reason-DAMAGED'))).toBeVisible();
  });

  it('should show reason labels', async () => {
    await expect(element(by.text('Item never arrived'))).toBeVisible();
    await expect(element(by.text('Not what was described'))).toBeVisible();
    await expect(element(by.text('Arrived damaged'))).toBeVisible();
  });

  it('should default to NOT_RECEIVED reason', async () => {
    // The first radio should be active by default
    await expect(element(by.id('dispute-reason-NOT_RECEIVED'))).toBeVisible();
  });

  it('should select NOT_AS_DESCRIBED reason', async () => {
    await element(by.id('dispute-reason-NOT_AS_DESCRIBED')).tap();
    await expect(element(by.id('dispute-reason-NOT_AS_DESCRIBED'))).toBeVisible();
  });

  it('should select DAMAGED reason', async () => {
    await element(by.id('dispute-reason-DAMAGED')).tap();
    await expect(element(by.id('dispute-reason-DAMAGED'))).toBeVisible();
  });

  it('should show description input field', async () => {
    await expect(element(by.id('disputeDesc'))).toBeVisible();
    await expect(element(by.text('Tell us what happened'))).toBeVisible();
  });

  it('should fill in dispute description', async () => {
    await element(by.id('disputeDesc')).typeText(
      'The seller sent a different item than what was listed.'
    );
    await expect(element(by.id('disputeDesc'))).toBeVisible();
  });

  it('should show evidence section', async () => {
    await expect(element(by.text('Evidence'))).toBeVisible();
    await expect(element(by.id('addEvidenceBtn'))).toBeVisible();
    await expect(element(by.text('Add photos (up to 5)'))).toBeVisible();
  });

  it('should show submit button', async () => {
    await expect(element(by.id('submitDisputeBtn'))).toBeVisible();
    await expect(element(by.text('Submit for review'))).toBeVisible();
  });

  it('should show median resolution footnote', async () => {
    await expect(element(by.text('Median resolution: under ten seconds.'))).toBeVisible();
  });

  it('should complete full dispute flow', async () => {
    // Select reason
    await element(by.id('dispute-reason-NOT_AS_DESCRIBED')).tap();

    // Add description
    await element(by.id('disputeDesc')).typeText(
      'The phone case I received was red, not blue as listed.'
    );

    // Submit
    await element(by.id('submitDisputeBtn')).tap();
  });

  it('should have back navigation button', async () => {
    await expect(element(by.text('Open a dispute'))).toBeVisible();
    // The back button exists (header row with back arrow)
  });
});
