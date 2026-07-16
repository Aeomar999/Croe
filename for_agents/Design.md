# Social Commerce Escrow Platform — UI/UX Design System & Psychology (Design.md)

## 1. Visual Psychology: Calm Over Confrontation
In fintech applications dealing with disputes or delayed deliveries, user anxiety is naturally elevated. Standard error UI patterns (blazing crimson reds, sharp clinical boxes, punitive legal terminology) trigger cognitive fight-or-flight responses, escalating user frustration and customer support volume.

The Social Escrow design system adheres to three core psychological tenets:
1. **Calm Palette**: Replaces alarmist reds with trustworthy deep blues, soothing slate grays, and approachable muted neutrals.
2. **Mathematical Breathing Room**: Enforces strict 8dp-grid geometric spacing (`16dp` / `20dp` / `24dp` padding) so interfaces never feel cluttered or claustrophobic.
3. **Soft Approachable Geometry**: Uses smooth container radiuses (`12dp` to `16dp`) to make financial protection feel supportive rather than punitive.

---

## 2. Design Tokens (Figma / Flutter Theme)

### 2.1 Color System (`AppColors`)
```dart
class AppColors {
  // Brand & Trust Colors
  static const Color primaryBlue = Color(0xFF2563EB);      // Primary actions, trust badges
  static const Color primaryBlueHover = Color(0xFF1D4ED8);
  static const Color trustAccent = Color(0xFF3B82F6);
  
  // Surface & Neutral Colors (Calming Backgrounds)
  static const Color surfaceLight = Color(0xFFF4F6F9);     // Muted neutral background card
  static const Color surfaceCard = Color(0xFFFFFFFF);
  static const Color borderSubtle = Color(0xFFE2E8F0);     // Soft container borders
  
  // Typography Colors
  static const Color textHeadline = Color(0xFF1E293B);     // Deep slate for high contrast
  static const Color textBody = Color(0xFF64748B);         // Soft slate for readable body text
  static const Color textMuted = Color(0xFF94A3B8);
  
  // Semantic Status Colors
  static const Color statusSecuredBg = Color(0xFFEFF6FF);
  static const Color statusSecuredText = Color(0xFF1E40AF);
  static const Color statusReviewBg = Color(0xFFFEF3C7);   // Warm amber (not crimson red!)
  static const Color statusReviewText = Color(0xFF92400E);
  static const Color statusSuccessBg = Color(0xFFDCFCE7);
  static const Color statusSuccessText = Color(0xFF166534);
}
```

### 2.2 Typography Scale (`AppTypography`)
- **Font Family**: *Outfit* or *Inter* (Modern geometric sans-serif).
- **Hierarchy**:
  - `Display Large`: `32px` / `1.2` line height / Bold (`700`)
  - `Headline Medium`: `20px` / `1.3` line height / SemiBold (`600`)
  - `Title Medium`: `16px` / `1.4` line height / Bold (`700`)
  - `Body Medium`: `14px` / `1.5` line height / Regular (`400`) — comfortable reading leading
  - `Caption Small`: `12px` / `1.4` line height / Medium (`500`)

### 2.3 Radius & Spacing Grid
- **Border Radiuses**:
  - `cardRadius`: `BorderRadius.circular(16.0)`
  - `buttonRadius`: `BorderRadius.circular(12.0)`
  - `pillBadgeRadius`: `BorderRadius.circular(999.0)`
- **Spacing Scale (8px base)**: `4dp`, `8dp`, `12dp`, `16dp`, `20dp`, `24dp`, `32dp`.

---

## 3. Core Component Layout & Blueprint

### 3.1 Dispute & Status Screen Structure
The screen layout is divided into three distinct vertical zones to eliminate visual noise:

```
+-------------------------------------------------------+
|  <-   Dispute: Order #89201           [Help]          |  <-- Clean navigation header
+-------------------------------------------------------+
|  +-------------------------------------------------+  |
|  |  [Shield Icon]  Funds Safely Locked             |  |  <-- Calming Status Card
|  |  The transaction amount has been frozen in      |  |      (#F4F6F9 neutral bg,
|  |  escrow. Neither party can access it until...   |  |       16dp rounded corners)
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
|  PROGRESS TRACKER                                     |
|                                                       |
|   (v)  Dispute Opened                                 |
|    |   10:14 AM - Claim submitted by Buyer            |
|   (•)  Automated Delivery & Media Review              |  <-- Clear vertical timeline
|    |   Checking SHA-256 evidence & chat logs          |      shows deterministic progress
|   ( )  Resolution & Payout                            |
+-------------------------------------------------------+
|  EVIDENCE SECURED                                     |
|  +-------------------------------------------------+  |
|  | [Hashed_Photo_01.jpg]      [v] SHA-256 Verified |  |  <-- Immutability reassurance
|  | [WhatsApp_Chat_Export]     [v] Forensic Logged  |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
|  [         Send Message to Support Team          ]    |  <-- De-escalation action
+-------------------------------------------------------+
```

### 3.2 Flutter Widget Implementation (`DisputeStatusCard`)
```dart
import 'package:flutter/material.dart';

class DisputeStatusCard extends StatelessWidget {
  const DisputeStatusCard({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F6F9), // Muted calming neutral background
        borderRadius: BorderRadius.circular(16.0), // Approachable rounded edges
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.shield_outlined,
            color: Color(0xFF2563EB), // Trustworthy blue
            size: 28,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Funds Safely Locked',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF1E293B),
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  'The transaction amount has been frozen in escrow. Neither party can access it until this review is resolved.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFF64748B),
                        height: 1.4,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## 4. Copywriting & Micro-Empathy Guidelines

Never display clinical backend terminology, exception stack traces, or punitive system warnings to end users.

| Scenario | ❌ Avoid (Punitive / Clinical / Terrifying) | ✅ Preferred (Micro-Empathetic / Reassuring) |
| :--- | :--- | :--- |
| **Dispute Opened** | `Transaction status: DISPUTE_OPENED. Account frozen pending cryptographic log audit.` | `We've safely paused this transaction. Our automated system is reviewing the delivery logs right now to make sure everything is sorted out fairly.` |
| **Photo Uploaded** | `SHA-256 hash calculated: 8f9d... recorded in immutable forensic table.` | `Photo verified and secured. Your evidence has been timestamped and protected against tampering.` |
| **Recycled Photo Detected** | `ERROR 403: FRAUD DETECTED. Duplicate SHA-256 hash found. Account penalized.` | `We couldn't verify this photo because it matches an image submitted in a previous transaction. Please upload an original photo taken today.` |
| **AI Processing** | `Gemma 4 LLM inference in progress. Waiting for JSON reasoning payload.` | `Our impartial review engine is evaluating both claims against the original listing description...` |
