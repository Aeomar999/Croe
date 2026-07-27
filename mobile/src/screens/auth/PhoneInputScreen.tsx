/**
 * PhoneInputScreen — first step of auth flow
 * Design: auth-phone.html
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, line, shape, space, layout, states } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Button } from '../../theme/components/Button';
import { Shield } from '../../theme/components/icons';
import { requestOTP } from '../../api/auth';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'PhoneInput'>;

export function PhoneInputScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatted = phone.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  const isValid = phone.length >= 9;

  const handleSend = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestOTP(`+233${phone}`);
      navigation.navigate('OtpEntry', { phone: `+233 ${formatted}`, countryCode: '+233' });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>croe</Text>
            <Text style={styles.brandDot}>.</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.body}>
          <View>
            <Text style={typography.title}>{"What's your number?"}</Text>
            <Text style={[typography.body, { color: inkColors.secondary, marginTop: space.s3 }]}>
              We'll text you a code. No passwords, ever.
            </Text>
          </View>

          <View style={{ marginTop: space.s6 }}>
            <Text style={styles.fieldLabel}>Mobile number</Text>
            <View style={styles.inputWrap}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+233</Text>
              </View>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                  setError(null);
                }}
                placeholder="24 123 4567"
                placeholderTextColor={inkColors.tertiary}
                keyboardType="phone-pad"
                maxLength={12}
                autoFocus
              />
            </View>
            <Text style={styles.helper}>Use the number linked to your MoMo wallet.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {/* Security wash */}
          <View style={styles.wash}>
            <View style={{ marginTop: 1 }}>
              <Shield size={19} color={states.secure.deep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: states.secure.deep }]}>
                Croe never sees your MoMo PIN
              </Text>
              <Text style={[typography.caption, { color: states.secure.deep, marginTop: 3 }]}>
                Payments are approved on your phone, by you.
              </Text>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* Actions */}
          <View>
            <View style={styles.btnWrap}>
              <Button
                title={loading ? '' : 'Send my code'}
                variant="ink"
                onPress={handleSend}
                disabled={!isValid || loading}
                fullWidth
              />
              {loading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={surfaces.surface} />
                </View>
              ) : null}
            </View>
            <Text style={styles.legal}>
              By continuing you agree to Croe's{' '}
              <Text style={styles.link}>Terms</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.s8,
  },
  brand: {
    flexDirection: 'row',
  },
  brandText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    color: inkColors.primary,
    letterSpacing: -0.4,
  },
  brandDot: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    color: states.secure.fill,
  },
  body: {
    flex: 1,
    gap: space.s6,
  },
  fieldLabel: {
    ...typography.subhead,
    color: inkColors.primary,
    marginBottom: space.s2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    borderWidth: 1,
    borderColor: line.primary,
    minHeight: layout.inputMinHeight,
    paddingHorizontal: space.s4,
  },
  prefix: {
    paddingRight: space.s3,
    borderRightWidth: 1,
    borderRightColor: line.primary,
    marginRight: space.s3,
  },
  prefixText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: inkColors.primary,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: inkColors.primary,
    paddingVertical: space.s3,
    fontSize: 16,
  },
  helper: {
    ...typography.caption,
    color: inkColors.tertiary,
    marginTop: space.s2,
  },
  error: {
    ...typography.caption,
    color: states.danger.deep,
    marginTop: space.s2,
  },
  wash: {
    flexDirection: 'row',
    gap: space.s3,
    alignItems: 'flex-start',
    backgroundColor: states.secure.wash,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    paddingLeft: space.s5,
  },
  btnWrap: {
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: {
    ...typography.caption,
    color: inkColors.tertiary,
    textAlign: 'center',
    marginTop: space.s3,
  },
  link: {
    color: inkColors.primary,
    textDecorationLine: 'underline',
  },
});
