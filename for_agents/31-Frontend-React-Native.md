# Croe — Frontend: React Native (`31-Frontend-React-Native.md`)

> **React Native + TypeScript.** No Flutter/Dart. Consumes [`30-API-Reference.md`](30-API-Reference.md) and [`32-Design-System.md`](32-Design-System.md). Custody phase: all (client is phase-agnostic).

## 1. Purpose & Boundaries

The mobile client for buyers and vendors: create/share escrow links, deposit, ship/confirm, dispute, track status. **Does not** hold business/money logic — it's a thin, resilient client over the API.

## 2. Stack

| Concern | Choice |
| :--- | :--- |
| Framework | **React Native 0.74+**, **TypeScript** (strict) |
| Tooling | **Expo (dev client)** recommended over bare RN — faster iteration, OTA updates, easy native modules; fall back to bare only if a needed native module lacks Expo support **[decide in impl]** |
| Navigation | **React Navigation** (native stack + tabs) |
| Server state | **TanStack Query (React Query)** — caching, retries, polling dispute status |
| Client state | **Zustand** (light) or Redux Toolkit — session, forms |
| HTTP | **Axios** instance + interceptors |
| Device/native | `react-native-device-info`, `@react-native-community/netinfo`, secure storage (`expo-secure-store` / `react-native-keychain`), `expo-crypto` / `react-native-quick-crypto`, `react-native-uuid` |
| Push | FCM/APNs via `@react-native-firebase/messaging` or `expo-notifications` |

## 3. HTTP Forensic Interceptor (must match backend expectations)

An Axios request interceptor injects forensic headers on every request and an `Idempotency-Key` on mutations:

```typescript
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import uuid from 'react-native-uuid';

export const api = axios.create({
  baseURL: 'https://<croe-host>/v1',
  timeout: 10000, // short, for flaky cellular
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    config.headers['X-Device-Fingerprint'] = await DeviceInfo.getUniqueId();
    config.headers['X-Network-Type'] = (await NetInfo.fetch()).type?.toUpperCase() ?? 'UNKNOWN';
    config.headers['X-App-Version'] = DeviceInfo.getVersion();
    config.headers['X-Client-Timestamp'] = new Date().toISOString();
  } catch (e) {
    config.headers['X-Forensic-Error'] = `capture failed: ${String(e)}`; // fail silently, flag internally
  }
  const method = (config.method ?? 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE'].includes(method) && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = uuid.v4() as string;
  }
  return config;
});
```

Header names are **identical** to what [`24`](24-Webhooks-and-Idempotency.md) / [`26`](26-Evidence-and-Forensics.md) expect. A response interceptor handles `401` (refresh-and-retry once) and maps the error catalog ([`30`](30-API-Reference.md)) to friendly copy.

## 4. Offline / Retry Resilience (emerging-market networks)

- Short timeouts + React Query retries with backoff on idempotent GETs.
- Mutations carry a **stable** `Idempotency-Key` per user intent (generated once, reused on retry) so a dropped connection after "Confirm Delivery" never double-acts.
- Optimistic UI for status, reconciled from server truth.
- Cache last-known contract status for offline viewing.

## 5. Core Screens

| Screen | Purpose |
| :--- | :--- |
| Auth (phone → OTP) | Login/register |
| Create Escrow (vendor) | Item, amount, currency → shareable Croe link |
| Pay / Deposit (buyer) | MoMo number + carrier → USSD |
| Transaction Status | Live state, timeline, actions (ship/confirm/dispute) |
| Dispute | Reason code, claim, evidence upload |
| Dispute Status | Progress tracker, calm copy ([`32`](32-Design-System.md)) |
| KYC | Tier upgrade |
| Wallet/History | Past transactions, payouts |

## 6. Acceptance Criteria

- No Flutter/Dart anywhere; app is RN + TypeScript.
- Interceptor injects exactly the forensic + idempotency headers the backend reads.
- A retried mutation never double-acts (stable idempotency key).
- Error responses render as calm, human copy, not raw codes.
