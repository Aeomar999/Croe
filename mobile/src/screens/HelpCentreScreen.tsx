import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, layout, space, line, shape } from '../theme/tokens';
import { typography } from '../theme/typography';
import { ArrowLeft, ChevronDown, ChevronRight } from '../theme/components/icons';
import { Button } from '../theme/components/Button';

export function HelpCentreScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [expanded, setExpanded] = useState<string | null>(null);

  const faqs = [
    { id: '1', q: 'How does escrow work?', a: 'Funds are securely held by Croe until both parties are satisfied. The seller is paid once the buyer confirms delivery.' },
    { id: '2', q: 'When do I get paid?', a: 'Payouts are triggered automatically to your Mobile Money account immediately after the buyer confirms they received the item.' },
    { id: '3', q: 'What if the item is damaged?', a: 'You can open a dispute. Our AI mediator will request evidence and help resolve the issue fairly.' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <Text style={typography.title}>Help Centre</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.heading, { marginBottom: space.s4 }]}>FAQs</Text>

        {faqs.map(faq => (
          <Pressable 
            key={faq.id} 
            style={styles.faqCard}
            onPress={() => setExpanded(expanded === faq.id ? null : faq.id)}
          >
            <View style={styles.faqHeader}>
              <Text style={[typography.subhead, { flex: 1 }]}>{faq.q}</Text>
              {expanded === faq.id ? <ChevronDown size={20} color={inkColors.secondary} /> : <ChevronRight size={20} color={inkColors.secondary} />}
            </View>
            {expanded === faq.id && (
              <Text style={[typography.body, { marginTop: space.s3, color: inkColors.secondary }]}>
                {faq.a}
              </Text>
            )}
          </Pressable>
        ))}

        <View style={styles.supportBox}>
          <Text style={typography.subhead}>Still need help?</Text>
          <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: space.s2, marginBottom: space.s4 }]}>
            Our support team is available 24/7.
          </Text>
          <Button title="Contact Support" variant="ink" onPress={() => {}} fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingVertical: space.s3,
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: line.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: layout.gutter,
  },
  faqCard: {
    backgroundColor: surfaces.surface,
    padding: layout.padSheet,
    borderRadius: shape.r3,
    marginBottom: space.s3,
    borderWidth: 1,
    borderColor: line.primary,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportBox: {
    marginTop: space.s6,
    padding: layout.padSheet,
    backgroundColor: surfaces.surface,
    borderRadius: shape.r3,
    alignItems: 'center',
  },
});
