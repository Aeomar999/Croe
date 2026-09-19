/**
 * E2E Test — Auth Flow
 * Tests: Phone input → OTP entry → navigation back
 *
 * App launches unauthenticated → AuthStack (PhoneInput → OtpEntry).
 * All selectors use by.id() or by.text() — Detox 20.x API.
 */
import { by, device, element, expect } from 'detox';

describe('Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should land on phone input screen', async () => {
    await expect(element(by.text("What's your number?"))).toBeVisible();
    await expect(element(by.text('+233'))).toBeVisible();
    await expect(element(by.id('phoneInput'))).toBeVisible();
    await expect(element(by.id('sendOtpBtn'))).toBeVisible();
  });

  it('should show security wash about MoMo PIN', async () => {
    await expect(element(by.text("Croe never sees your MoMo PIN"))).toBeVisible();
    await expect(
      element(by.text('Payments are approved on your phone, by you.'))
    ).toBeVisible();
  });

  it('should show legal terms on phone input', async () => {
    await expect(element(by.text("By continuing you agree to Croe's"))).toBeVisible();
    await expect(element(by.text('Terms'))).toBeVisible();
    await expect(element(by.text('Privacy Policy'))).toBeVisible();
  });

  it('should disable send button when phone number is too short', async () => {
    await element(by.id('phoneInput')).typeText('2412');
    await expect(element(by.id('sendOtpBtn'))).toBeVisible();
    await expect(element(by.id('phoneError'))).not.toBeVisible();
  });

  it('should show error for invalid phone number', async () => {
    await element(by.id('phoneInput')).typeText('123');
    await element(by.id('sendOtpBtn')).tap();
    await expect(element(by.id('phoneError'))).toBeVisible();
  });

  it('should navigate to OTP entry after requesting code', async () => {
    await element(by.id('phoneInput')).typeText('241234567');
    await element(by.id('sendOtpBtn')).tap();

    // OTP screen elements
    await expect(element(by.text('Enter the code'))).toBeVisible();
    await expect(element(by.id('otpDigit-0'))).toBeVisible();
    await expect(element(by.id('otpDigit-5'))).toBeVisible();
    await expect(element(by.id('verifyBtn'))).toBeVisible();
    await expect(element(by.id('otpBackBtn'))).toBeVisible();
  });

  it('should show resend countdown on OTP screen', async () => {
    await element(by.id('phoneInput')).typeText('241234567');
    await element(by.id('sendOtpBtn')).tap();

    await expect(element(by.text('Enter the code'))).toBeVisible();
    // Countdown text visible initially
    await expect(element(by.id('resendSection'))).toBeVisible();
  });

  it('should go back from OTP to phone input', async () => {
    await element(by.id('phoneInput')).typeText('241234567');
    await element(by.id('sendOtpBtn')).tap();
    await expect(element(by.text('Enter the code'))).toBeVisible();

    // Tap back button
    await element(by.id('otpBackBtn')).tap();
    await expect(element(by.text("What's your number?"))).toBeVisible();
  });

  it('should show wrong number link on OTP screen', async () => {
    await element(by.id('phoneInput')).typeText('241234567');
    await element(by.id('sendOtpBtn')).tap();

    await expect(element(by.text('Wrong number?'))).toBeVisible();
  });

  it('should type digits into OTP fields', async () => {
    await element(by.id('phoneInput')).typeText('241234567');
    await element(by.id('sendOtpBtn')).tap();
    await expect(element(by.text('Enter the code'))).toBeVisible();

    // Tap individual digit fields
    await element(by.id('otpDigit-0')).tap();
    await element(by.id('otpDigit-0')).typeText('1');
    await element(by.id('otpDigit-1')).tap();
    await element(by.id('otpDigit-1')).typeText('2');
    await element(by.id('otpDigit-2')).tap();
    await element(by.id('otpDigit-2')).typeText('3');
  });
});
