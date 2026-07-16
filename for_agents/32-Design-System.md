# Croe — Design System (`32-Design-System.md`)

> React Native implementation. "Calm over confrontation." Consumed by [`31-Frontend-React-Native.md`](31-Frontend-React-Native.md) and the notification templates ([`27`](27-Notifications.md)).

## 1. Visual Psychology

Users in a dispute are already anxious. Croe avoids alarmist patterns and signals control and safety:
1. **Calm palette** — trustworthy blues, soft slate grays, muted amber for warnings (never crimson).
2. **Mathematical breathing room** — 8pt spacing grid; generous 16/20/24 padding.
3. **Soft geometry** — 12–16 radius on cards; supportive, not clinical.

## 2. Design Tokens

Framework-agnostic values, exposed as a typed RN theme object:

```typescript
export const colors = {
  primaryBlue: '#2563EB', primaryBlueHover: '#1D4ED8', trustAccent: '#3B82F6',
  surfaceLight: '#F4F6F9', surfaceCard: '#FFFFFF', borderSubtle: '#E2E8F0',
  textHeadline: '#1E293B', textBody: '#64748B', textMuted: '#94A3B8',
  statusSecuredBg: '#EFF6FF', statusSecuredText: '#1E40AF',
  statusReviewBg: '#FEF3C7', statusReviewText: '#92400E',   // warm amber, not red
  statusSuccessBg: '#DCFCE7', statusSuccessText: '#166534',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius  = { button: 12, card: 16, pill: 999 } as const;

export const typography = {
  displayLg: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  headlineMd:{ fontSize: 20, lineHeight: 26, fontWeight: '600' },
  titleMd:   { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  bodyMd:    { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  captionSm: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
} as const; // Font family: Inter or Outfit
```

## 3. Component Blueprint — `DisputeStatusCard` (RN/TSX)

```tsx
import { View, Text } from 'react-native';
import { Shield } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../theme';

export function DisputeStatusCard() {
  return (
    <View style={{
      padding: spacing.xl, borderRadius: radius.card,
      backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.borderSubtle,
      flexDirection: 'row', alignItems: 'flex-start',
    }}>
      <Shield size={28} color={colors.primaryBlue} />
      <View style={{ marginLeft: spacing.lg, flex: 1 }}>
        <Text style={{ ...typography.titleMd, color: colors.textHeadline }}>Funds Safely Locked</Text>
        <Text style={{ ...typography.bodyMd, color: colors.textBody, marginTop: spacing.xs + 2 }}>
          The amount is frozen in escrow. Neither party can access it until this review is resolved.
        </Text>
      </View>
    </View>
  );
}
```

## 4. Screen Structure — Dispute/Status

Three calm vertical zones: (1) status card (shield, reassurance), (2) vertical progress tracker (Dispute Opened → Automated Review → Resolution), (3) evidence list with "SHA-256 Verified" badges, then a de-escalation "Message Support" action.

## 5. Copywriting — Micro-Empathy

Never show backend enums, stack traces, or punitive warnings. (Shared with [`27-Notifications.md`](27-Notifications.md) templates.)

| Scenario | ❌ Avoid | ✅ Croe |
| :--- | :--- | :--- |
| Dispute opened | `DISPUTE_OPENED. Account frozen pending audit.` | "We've safely paused this transaction. Our automated review is checking the delivery details to sort it out fairly." |
| Photo uploaded | `SHA-256 8f9d… recorded.` | "Photo verified and secured. Your evidence is timestamped and protected against tampering." |
| Recycled photo | `ERROR 403: FRAUD. Duplicate hash.` | "We couldn't verify this photo — it matches an image from a previous transaction. Please upload an original taken today." |
| AI processing | `LLM inference in progress.` | "Our impartial review engine is comparing both claims against the original listing…" |

## 6. Acceptance Criteria

- All code samples are RN/TSX (no Dart).
- Tokens match usage in [`31`](31-Frontend-React-Native.md); warnings use amber, never crimson.
- Every user-facing string follows the micro-empathy tone.
