/**
 * OtpEntryScreen — 6-digit OTP verification
 * Design: auth-otp.html
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, line, shape, space, layout, states } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Button } from '../../theme/components/Button';
import { ArrowLeft } from '../../theme/components/icons';
import { verifyOTP, requestOTP } from '../../api/auth';
import { useAuthStore } from '../../stores/auth';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'OtpEntry'>;
type Route = RouteProp<AuthStackParamList, 'OtpEntry'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function OtpEntryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { setTokens } = useAuthStore();

  const { phone } = route.params;
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const code = digits.join('');

  const handleVerify = useCallback(
    async (otp: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyOTP(phone, otp);
        await setTokens(result.access_token, result.refresh_token);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Invalid code. Try again.');
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRef.current?.focus(), 200);
      } finally {
        setLoading(false);
      }
    },
    [phone, setTokens],
  );

  const handleChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
      const newDigits = cleaned.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
      setDigits(newDigits);
      setError(null);

      if (cleaned.length === OTP_LENGTH) {
        handleVerify(cleaned);
      }
    },
    [handleVerify],
  );

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await requestOTP(phone);
      setCountdown(RESEND_SECONDS);
      setError(null);
    } catch {
      setError('Could not resend. Try again in a moment.');
    }
  };

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* Back button */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <ArrowLeft size={20} color={inkColors.primary} />
        </Pressable>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={typography.title}>Enter the code</Text>
          <Text style={[typography.body, { color: inkColors.secondary, marginTop: space.s3 }]}>
            Sent to{' '}
            <Text style={{ fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold' }}>{phone}</Text>
            {' · '}
            <Text style={styles.link} onPress={() => navigation.goBack()}>
              Wrong number?
            </Text>
          </Text>
        </View>

        {/* OTP cells */}
        <View style={styles.otpSection}>
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            textContentType="oneTimeCode"
            autoFocus
          />
          <View style={styles.otpRow}>
            {digits.map((d, i) => {
              const isActive = i === code.length && code.length < OTP_LENGTH;
              const isFilled = !!d;
              return (
                <View
                  key={i}
                  style={[
                    styles.otpCell,
                    isActive && styles.otpCellActive,
                    isFilled && styles.otpCellFilled,
                  ]}
                >
                  <Text
                    style={[
                      styles.otpDigit,
                      isFilled && styles.otpDigitFilled,
                      isActive && styles.otpDigitActive,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={[typography.caption, { color: inkColors.tertiary }]}>
                Resend in {formatCountdown(countdown)}
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text style={[typography.label, { color: inkColors.primary }]}>
                  Resend code
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {error ? (
          <Text style={[typography.caption, { color: states.danger.deep, textAlign: 'center' }]}>
            {error}
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />

        {/* Hint + verify */}
        <View style={styles.footer}>
          <Text style={styles.hint}>
            Codes can take a minute on a busy network. If it doesn't arrive,
            we'll offer a call instead.
          </Text>
          <View style={styles.btnWrap}>
            <Button
              title={loading ? '' : 'Verify'}
              variant="ink"
              onPress={() => handleVerify(code)}
              disabled={code.length !== OTP_LENGTH || loading}
              fullWidth
            />
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={surfaces.surface} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  container: {
    flex: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: 24,
  },
  backBtn: {
    width: layout.iconBtnSize,
    height: layout.iconBtnSize,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.s6,
  },
  titleSection: {
    marginBottom: space.s8,
  },
  link: {
    ...typography.body,
    color: inkColors.primary,
    textDecorationLine: 'underline',
  },
  otpSection: {
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  otpRow: {
    flexDirection: 'row',
    gap: space.s3,
    justifyContent: 'center',
  },
  otpCell: {
    width: 48,
    height: layout.otpCellHeight,
    borderRadius: shape.r2,
    backgroundColor: surfaces.surface,
    borderWidth: 1.5,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellActive: {
    borderColor: inkColors.primary,
  },
  otpCellFilled: {
    backgroundColor: surfaces.sunken,
    borderColor: line.primary,
  },
  otpDigit: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: inkColors.primary,
  },
  otpDigitFilled: {
    fontWeight: '700',
  },
  otpDigitActive: {
    color: inkColors.primary,
  },
  resendRow: {
    marginTop: space.s4,
    alignItems: 'center',
  },
  footer: {
    gap: space.s3,
  },
  hint: {
    ...typography.caption,
    color: inkColors.tertiary,
    textAlign: 'center',
    marginBottom: space.s2,
  },
  btnWrap: {
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
