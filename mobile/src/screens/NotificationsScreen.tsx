import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surfaces, ink as inkColors, layout, space, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { ArrowLeft } from '../theme/components/icons';
import { api } from '../api/client';

export function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const res = await api.get('/users/me/preferences');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (newPrefs: any) => {
      const res = await api.put('/users/me/preferences', newPrefs);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-preferences'], data);
    }
  });

  const handleToggle = (key: string, value: boolean) => {
    if (!preferences) return;
    mutation.mutate({
      ...preferences,
      [key]: value
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <Text style={typography.title}>Notifications</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={inkColors.primary} style={{ marginTop: space.s6 }} />
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={typography.subhead}>Push Notifications</Text>
                <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
                  Receive alerts on your device for updates.
                </Text>
              </View>
              <Switch 
                value={preferences?.push_notifications_enabled} 
                onValueChange={(v) => handleToggle('push_notifications_enabled', v)}
                disabled={mutation.isPending}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={typography.subhead}>Email</Text>
                <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
                  Get daily summaries and transaction receipts.
                </Text>
              </View>
              <Switch 
                value={preferences?.email_notifications_enabled} 
                onValueChange={(v) => handleToggle('email_notifications_enabled', v)} 
                disabled={mutation.isPending}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={typography.subhead}>SMS Alerts</Text>
                <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
                  Critical alerts about deliveries and payouts.
                </Text>
              </View>
              <Switch 
                value={preferences?.sms_notifications_enabled} 
                onValueChange={(v) => handleToggle('sms_notifications_enabled', v)} 
                disabled={mutation.isPending}
              />
            </View>
          </>
        )}
      </View>
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
    gap: space.s4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.s2,
  },
  rowText: {
    flex: 1,
    paddingRight: space.s4,
  },
});
