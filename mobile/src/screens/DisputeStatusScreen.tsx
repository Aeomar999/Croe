import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { surfaces, ink as inkColors, space, layout, states, line, shape } from '../theme/tokens';
import { typography } from '../theme/typography';
import { ArrowLeft, Shield, Clock, Check, AlertCircle } from '../theme/components/icons';
import { useEscrow } from '../hooks/useEscrow';
import { Pill } from '../theme/components/Pill';

export function DisputeStatusScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const transactionId = route.params?.transactionId || '';
  
  const { data: escrow, isLoading } = useEscrow(transactionId);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={inkColors.primary} />
      </View>
    );
  }

  const status = escrow?.current_status;
  const isResolved = status === 'RESOLVED_AUTO' || status === 'FUNDS_REFUNDED' || status === 'FUNDS_RELEASED';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <Text style={typography.heading}>Dispute Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={[styles.iconCircle, { backgroundColor: isResolved ? states.secure.wash : states.caution.wash }]}>
            {isResolved ? (
              <Check size={32} color={states.secure.deep} />
            ) : status === 'UNDER_HUMAN_REVIEW' ? (
              <Clock size={32} color={states.caution.deep} />
            ) : (
              <AlertCircle size={32} color={states.caution.deep} />
            )}
          </View>
          <Text style={[typography.title, { marginTop: space.s4 }]}>
            {isResolved ? 'Dispute Resolved' : status === 'UNDER_HUMAN_REVIEW' ? 'Under Human Review' : 'AI Processing'}
          </Text>
          <Text style={[typography.body, { color: inkColors.tertiary, textAlign: 'center', marginTop: space.s2 }]}>
            {isResolved 
              ? 'This dispute has been successfully resolved.'
              : status === 'UNDER_HUMAN_REVIEW'
              ? 'Our team is carefully reviewing the evidence you submitted. We will notify you once a decision is made.'
              : 'Our automated system is processing your dispute claim. This usually takes less than 10 seconds.'
            }
          </Text>
        </View>

        <View style={styles.timelineSection}>
          <Text style={typography.subhead}>Timeline</Text>
          <View style={styles.timelineItem}>
            <View style={[styles.dot, { backgroundColor: states.secure.deep }]} />
            <View style={styles.timelineContent}>
              <Text style={typography.label}>Dispute Opened</Text>
              <Text style={[typography.caption, { color: inkColors.tertiary }]}>Evidence submitted successfully</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.dot, { backgroundColor: isResolved ? states.secure.deep : states.caution.deep }]} />
            <View style={styles.timelineContent}>
              <Text style={typography.label}>{isResolved ? 'Resolution' : 'In Progress'}</Text>
              <Text style={[typography.caption, { color: inkColors.tertiary }]}>
                {isResolved ? 'A decision has been reached' : 'Reviewing claim details'}
              </Text>
            </View>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: space.s4,
    borderBottomWidth: 1,
    borderBottomColor: line.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    padding: layout.gutter,
    gap: space.s6,
  },
  statusCard: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: line.primary,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineSection: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    borderWidth: 1,
    borderColor: line.primary,
    gap: space.s4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
});
