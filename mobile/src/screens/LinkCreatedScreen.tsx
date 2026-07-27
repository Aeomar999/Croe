/**
 * LinkCreatedScreen — success moment, ready to share
 * Design: link-created.html
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { Pill } from '../theme/components/Pill';
import { Check, Shield, X } from '../theme/components/icons';

export function LinkCreatedScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const payUrl = 'croe.app/pay/CR-89201';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pay GH₵ 450.00 securely via Croe: ${payUrl}`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Close button */}
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={18} color={inkColors.primary} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Pill state="secure" label="Link live" idiom="signal-hero" />
          <Text style={[typography.title, { marginTop: space.s4 }]}>
            Your link is live
          </Text>
          <Text style={[typography.body, { marginTop: space.s2, textAlign: 'center', paddingHorizontal: space.s6 }]}>
            Send it to your buyer. They pay into escrow, and you'll be told the moment the money is secured.
          </Text>
        </View>

        {/* Chat preview */}
        <View style={styles.chatWell}>
          <View style={styles.bubble}>
            <Text style={styles.brand}>Croe escrow</Text>
            <Text style={styles.itemTitle}>Nike Air Max 270 — size 43</Text>
            <Text style={styles.price}>GH₵ 450.00</Text>
            <View style={styles.bubbleLinkRow}>
              <Text style={styles.bubbleLink}>{payUrl}</Text>
            </View>
            <Text style={styles.bubbleTime}>14:02</Text>
          </View>
        </View>

        {/* Copy row */}
        <Pressable style={styles.copyRow}>
          <Text style={styles.copyUrl}>{payUrl}</Text>
          <Text style={styles.copyBtn}>Copy</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Share to WhatsApp" variant="ink" onPress={handleShare} fullWidth />
          <Button title="More options" variant="line" onPress={handleShare} fullWidth />
          <Text style={styles.footNote}>Holds this price for 24 hours.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: 24,
    gap: space.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  chatWell: {
    backgroundColor: surfaces.sunken,
    borderRadius: shape.r4,
    padding: space.s4,
  },
  bubble: {
    backgroundColor: surfaces.surface,
    borderRadius: `${shape.r2} ${shape.r2} ${shape.r2} 4px`,
    padding: space.s4,
  },
  brand: {
    ...typography.micro,
    color: states.secure.deep,
    marginBottom: 6,
  },
  itemTitle: {
    ...typography.label,
    fontSize: 14,
    marginTop: 6,
  },
  price: {
    ...typography.display,
    fontSize: 19,
    marginTop: 2,
  },
  bubbleLinkRow: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: line.primary,
  },
  bubbleLink: {
    ...typography.caption,
    fontWeight: '600',
  },
  bubbleTime: {
    ...typography.micro,
    textTransform: 'none',
    fontWeight: '400',
    color: inkColors.tertiary,
    textAlign: 'right',
    marginTop: 6,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    padding: 12,
    paddingHorizontal: space.s4,
  },
  copyUrl: {
    flex: 1,
    ...typography.label,
    fontSize: 13,
    color: inkColors.secondary,
  },
  copyBtn: {
    ...typography.label,
    fontSize: 12.5,
  },
  actions: {
    gap: space.s2,
  },
  footNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: space.s3,
  },
});
