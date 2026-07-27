/**
 * DisputeOpenScreen — open a dispute form
 * Design: dispute-open.html
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { Pill } from '../theme/components/Pill';
import { ArrowLeft, Plus, Shield } from '../theme/components/icons';

type DisputeReason = 'NOT_RECEIVED' | 'NOT_AS_DESCRIBED' | 'DAMAGED';

const REASONS: { key: DisputeReason; label: string }[] = [
  { key: 'NOT_RECEIVED', label: 'Item never arrived' },
  { key: 'NOT_AS_DESCRIBED', label: 'Not what was described' },
  { key: 'DAMAGED', label: 'Arrived damaged' },
];

export function DisputeOpenScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = React.useState<DisputeReason>('NOT_RECEIVED');
  const [description, setDescription] = React.useState('');

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
            Open a dispute
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Reassurance wash */}
        <View style={styles.washSecure}>
          <Shield size={19} color={states.secure.deep} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: states.secure.deep }]}>
              Funds safely locked
            </Text>
            <Text style={[typography.caption, { color: states.secure.deep, marginTop: 3 }]}>
              GH₵ 450.00 stays frozen until this is resolved.
            </Text>
          </View>
        </View>

        {/* Reason picker */}
        <View style={styles.field}>
          <Text style={styles.label}>What went wrong?</Text>
          <View style={styles.choices}>
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                style={[styles.choice, reason === r.key && styles.choiceActive]}
                onPress={() => setReason(r.key)}
              >
                <View style={[styles.marker, reason === r.key && styles.markerActive]}>
                  {reason === r.key && <View style={styles.markerDot} />}
                </View>
                <Text style={[styles.choiceLabel, reason === r.key && styles.choiceLabelActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Tell us what happened</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Facts help our review resolve this faster."
            placeholderTextColor={inkColors.tertiary}
          />
        </View>

        {/* Evidence */}
        <View style={styles.field}>
          <Text style={styles.label}>Evidence</Text>
          <Pressable style={styles.addEvidenceBtn}>
            <Plus size={16} color={inkColors.primary} />
            <Text style={[typography.label, { color: inkColors.primary }]}>
              Add photos (up to 5)
            </Text>
          </Pressable>
          {/* Mock uploaded file */}
          <View style={styles.evidenceRow}>
            <View style={styles.evMark}>
              <Shield size={18} color={states.secure.fill} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { fontSize: 14.5 }]}>IMG_2041.JPG</Text>
              <Text style={[typography.caption, { marginTop: 1 }]}>Uploaded 14:31</Text>
            </View>
            <Pill state="done" label="Verified" isEnd />
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />

        {/* CTA */}
        <View>
          <Button title="Submit for review" variant="ink" onPress={() => {}} fullWidth />
          <Text style={styles.footNote}>
            Median resolution: under ten seconds.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: surfaces.canvas },
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
  washSecure: {
    flexDirection: 'row',
    gap: space.s3,
    alignItems: 'flex-start',
    backgroundColor: states.secure.wash,
    borderRadius: shape.r4,
    padding: space.s4,
    paddingLeft: space.s5,
  },
  field: { gap: space.s2 },
  label: {
    ...typography.label,
    color: inkColors.secondary,
  },
  choices: {
    gap: space.s2,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
    padding: 14,
    paddingHorizontal: space.s4,
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
  choiceLabel: {
    ...typography.label,
    fontSize: 13.5,
    color: inkColors.primary,
  },
  choiceLabelActive: {},
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
  textarea: {
    minHeight: 108,
    textAlignVertical: 'top',
    paddingTop: space.s4,
    lineHeight: 22,
  },
  addEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: layout.buttonHeightSm,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: line.secondary,
    borderRadius: shape.r2,
    gap: space.s2,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    padding: 10,
    paddingHorizontal: 12,
    gap: space.s3,
  },
  evMark: {
    width: 40,
    height: 40,
    borderRadius: shape.r1,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: space.s3,
  },
});
