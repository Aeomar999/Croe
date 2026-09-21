/**
 * CreateEscrowScreen — vendor builds a shareable escrow link
 * Design: create-escrow.html
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { useCreateEscrow } from '../hooks/useEscrow';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { WashBanner } from '../theme/components/WashBanner';
import { ArrowLeft, Info } from '../theme/components/icons';
import type { MainStackParamList } from '../navigation/MainStack';

type DeliveryMode = 'MEETUP' | 'COURIER';

export function CreateEscrowScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateEscrow();

  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [delivery, setDelivery] = React.useState<DeliveryMode>('COURIER');

  const fee = amount ? (parseFloat(amount) * 0.025).toFixed(2) : '0.00';
  const received = amount ? (parseFloat(amount) - parseFloat(fee)).toFixed(2) : '0.00';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={inkColors.primary} />
          </Pressable>
          <Text style={[typography.heading, { flex: 1, textAlign: 'center' }]}>
            New escrow link
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>What are you selling?</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Nike Air Max 270 — size 43"
            placeholderTextColor={inkColors.tertiary}
          />
        </View>

        {/* Amount */}
        <View style={styles.field}>
          <Text style={styles.label}>How much?</Text>
          <View style={styles.amountInput}>
            <Text style={styles.amountPrefix}>GH₵</Text>
            <TextInput
              style={styles.amountField}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={inkColors.tertiary}
            />
          </View>
          <Text style={styles.helper}>
            Croe fee 2.5% · you receive GH₵ {received}
          </Text>
        </View>

        {/* Delivery mode */}
        <View style={styles.field}>
          <Text style={styles.label}>How is it getting there?</Text>
          <View style={styles.deliveryPair}>
            <Pressable
              style={[styles.choice, delivery === 'MEETUP' && styles.choiceActive]}
              onPress={() => setDelivery('MEETUP')}
            >
              <View style={[styles.marker, delivery === 'MEETUP' && styles.markerActive]}>
                {delivery === 'MEETUP' && <View style={styles.markerDot} />}
              </View>
              <View>
                <Text style={styles.choiceTitle}>Meet-up</Text>
                <Text style={styles.choiceSub}>In person</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.choice, delivery === 'COURIER' && styles.choiceActive]}
              onPress={() => setDelivery('COURIER')}
            >
              <View style={[styles.marker, delivery === 'COURIER' && styles.markerActive]}>
                {delivery === 'COURIER' && <View style={styles.markerDot} />}
              </View>
              <View>
                <Text style={styles.choiceTitle}>Courier</Text>
                <Text style={styles.choiceSub}>Tracked</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Protection window */}
        <View style={styles.protectRow}>
          <Text style={styles.protectLabel}>Buyer protection window</Text>
          <Text style={styles.protectValue}>24h after delivery</Text>
        </View>

        {/* Tier warning */}
        <WashBanner
          variant="caution"
          title="Links above GH₵ 5,000.00 need Tier 2"
          body="Add your Ghana Card to raise your limit."
          icon={<Info size={18} color={states.caution.deep} />}
        />

        <View style={{ flex: 1, minHeight: 20 }} />

        {/* CTA */}
        <View>
          <Button
            title="Create secure link"
            variant="ink"
            onPress={() => {
              if (!description || !amount) {
                // Should show some toast/error ideally
                return;
              }
              createMutation.mutate({
                item_description: description,
                amount: amount,
                currency: 'GHS',
                delivery_terms: delivery,
              }, {
                onSuccess: (data) => {
                  // The backend might return the deep link or transaction ID
                  navigation.navigate('LinkCreated', {
                    transactionId: data.transaction_id,
                    deepLink: `croe.app/pay/${data.transaction_id.slice(-6).toUpperCase()}`,
                  });
                },
                onError: (error) => {
                  console.error(error);
                }
              });
            }}
            fullWidth
            disabled={createMutation.isPending}
          />
          <Text style={styles.footNote}>
            Share it in WhatsApp, Instagram, anywhere.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: 24,
    gap: space.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.s2,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    gap: space.s2,
  },
  label: {
    ...typography.label,
    color: inkColors.secondary,
  },
  input: {
    minHeight: layout.inputMinHeight,
    paddingHorizontal: space.s4,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
    ...typography.body,
    color: inkColors.primary,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.inputMinHeight,
    paddingHorizontal: space.s4,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
    gap: space.s3,
  },
  amountPrefix: {
    ...typography.body,
    color: inkColors.tertiary,
    fontWeight: '600',
  },
  amountField: {
    flex: 1,
    ...typography.heading,
    fontSize: 22,
    color: inkColors.primary,
    paddingVertical: space.s4,
  },
  helper: {
    ...typography.caption,
    marginTop: 2,
  },
  deliveryPair: {
    flexDirection: 'row',
    gap: space.s2,
  },
  choice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
    padding: 14,
  },
  choiceActive: {
    borderColor: inkColors.primary,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: shape.full,
    borderWidth: 1.5,
    borderColor: line.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerActive: {
    borderColor: inkColors.primary,
    backgroundColor: inkColors.primary,
  },
  markerDot: {
    width: 7,
    height: 7,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
  },
  choiceTitle: {
    ...typography.label,
    fontSize: 13.5,
  },
  choiceSub: {
    ...typography.micro,
    textTransform: 'none',
    fontWeight: '500',
    color: inkColors.tertiary,
    marginTop: 2,
  },
  protectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    padding: space.s3,
    paddingHorizontal: space.s4,
  },
  protectLabel: {
    ...typography.label,
    fontSize: 13.5,
    color: inkColors.primary,
  },
  protectValue: {
    ...typography.label,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  footNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: space.s3,
  },
});
