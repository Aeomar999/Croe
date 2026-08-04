# Onboarding Activation Tail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry a seller from "verified number" to "first link shared" — a display name, a confirmed payout destination, a Home checklist, and just-in-time KYC.

**Architecture:** Full-stack. A `display_name` column separates the storefront name from the KYC legal name. `GET /auth/me` grows the two fields the client needs, `PATCH /users/me` writes the display name. Role select gains a real branch: sellers pass through a combined Setup screen, buyers go straight to Home. KYC is reached only when a transaction exceeds the Tier 0 cap.

**Tech Stack:** Node 20 / Express / PostgreSQL 16 / node-pg-migrate / Vitest on the backend. React Native 0.81 (Expo 54), Zustand, TanStack Query, Jest on the client.

## Global Constraints

- TypeScript strict on both sides — `noImplicitAny`, `strictNullChecks`. No `any`.
- **One migration per change. Never edit a shipped migration.** Next number is `006`.
- Backend routes mount under `/v1` in `src/index.ts` and use the `authenticate` middleware from `src/middleware/auth.ts`, which populates `req.userId` and `req.kycTier`.
- Backend errors are thrown as `AppError(status, message, code)` from `src/middleware/error-handler.js`. Never return a raw enum or stack trace to a client.
- Client never renders a backend error code. Route everything through `friendlyError()` in `src/api/client.ts`.
- Money is always `GH₵` with tabular figures. Tier caps live in `KYC_LIMITS` in `src/services/kyc.ts` — never hardcode a limit in a screen.
- Design tokens only. Type from `src/theme/typography.ts`.
- Component tests are `*.test.tsx` (jest project `components`). Logic tests are `src/__tests__/**/*.test.ts` (project `node`). Backend tests are `src/**/*.test.ts` under Vitest.
- Commit messages must NOT include a `Co-Authored-By: Claude` trailer or any Claude attribution.
- **`users.role` already exists** from migration 004 and is RBAC (`consumer`/`reviewer`/`ops`/`admin`). It is unrelated to the onboarding seller/buyer role, which stays on-device in `stores/onboarding.ts`. Do not conflate them.

## Blocking Dependency

`backend/src/services/escrow.ts:533` and `:655` pass `vendorMsisdn: "unknown"` / `buyerMsisdn: "unknown"` to `releaseTo()` / `refundTo()`. Until those resolve `users.phone_number`, the payout destination this plan asks a seller to confirm is not the one the release path uses.

**Task 6 (SetupScreen) may be built before that fix lands, but must not ship to users until it does.** Verify the fix is merged before releasing.

---

### Task 1: `display_name` column

**Files:**
- Create: `backend/migrations/006_user_display_name.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `users.display_name VARCHAR(50) NULL` — what a buyer sees on a payment link. Distinct from `users.full_name`, which remains the KYC Tier 1 legal name.

- [ ] **Step 1: Write the migration**

Create `backend/migrations/006_user_display_name.ts`:

```ts
import type { MigrationBuilder } from "node-pg-migrate";

/**
 * display_name is the storefront name a buyer sees on a payment link
 * ("Ama's Closet"). It is deliberately NOT full_name, which is the legal name
 * taken from an identity document at KYC Tier 1 — a good storefront name is a
 * bad legal name, and conflating them would put a nickname on a KYC record.
 *
 * Nullable: a seller can skip Setup and recover from the Home checklist.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "users" ADD COLUMN "display_name" VARCHAR(50)`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "users" DROP COLUMN "display_name"`);
}
```

- [ ] **Step 2: Run the migration up**

Run: `cd backend && npm run db:migrate`

Expected: `### MIGRATION 006_user_display_name (UP) ###` and no error.

- [ ] **Step 3: Verify the column exists and is reversible**

Run: `cd backend && npm run db:migrate:down && npm run db:migrate`

Expected: the down removes the column without error, the up re-adds it. A migration that cannot roll back is a broken migration.

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/006_user_display_name.ts
git commit -m "feat(db): add users.display_name for seller storefront name"
```

---

### Task 2: `/auth/me` returns the fields the client needs

`GET /auth/me` currently returns only `user_id` and `kyc_tier`. The client needs the phone number to show a payout destination, and the display name to know whether Setup is done.

**Files:**
- Modify: `backend/src/routes/auth.ts:106-112`
- Test: `backend/src/routes/auth.me.test.ts` (create)

**Interfaces:**
- Consumes: `users.display_name` (Task 1)
- Produces: `GET /auth/me` → `{ user_id: string, kyc_tier: number, phone_number: string, display_name: string | null }`

- [ ] **Step 1: Write the failing test**

Create `backend/src/routes/auth.me.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const query = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: { query: (...args: unknown[]) => query(...args) },
  getTransactionClient: vi.fn(),
}));

const { buildMeResponse } = await import("./auth.js");

beforeEach(() => {
  query.mockReset();
});

describe("buildMeResponse", () => {
  it("returns the phone number and display name for the user", async () => {
    query.mockResolvedValue({
      rows: [{ phone_number: "+233241234567", display_name: "Ama's Closet" }],
    });

    const result = await buildMeResponse("user-1", 1);

    expect(result).toEqual({
      user_id: "user-1",
      kyc_tier: 1,
      phone_number: "+233241234567",
      display_name: "Ama's Closet",
    });
  });

  it("returns a null display name for a seller who skipped setup", async () => {
    query.mockResolvedValue({
      rows: [{ phone_number: "+233241234567", display_name: null }],
    });

    const result = await buildMeResponse("user-1", 0);

    expect(result.display_name).toBeNull();
  });

  it("throws when the user row is missing rather than returning a partial identity", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(buildMeResponse("ghost", 0)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/routes/auth.me.test.ts`

Expected: FAIL — `buildMeResponse` is not exported from `./auth.js`

- [ ] **Step 3: Write minimal implementation**

In `backend/src/routes/auth.ts`, add the pool import alongside the existing imports:

```ts
import { pool } from "../db/pool.js";
```

Add the exported helper above the `/auth/me` route:

```ts
export interface MeResponse {
  user_id: string;
  kyc_tier: number;
  phone_number: string;
  display_name: string | null;
}

/**
 * Exported separately from the route so the shape can be tested without
 * standing up Express. The client depends on all four fields: phone_number
 * for the payout destination it asks a seller to confirm, display_name to
 * know whether Setup is still outstanding.
 */
export async function buildMeResponse(
  userId: string,
  kycTier: number,
): Promise<MeResponse> {
  const { rows } = await pool.query<{
    phone_number: string;
    display_name: string | null;
  }>(`SELECT phone_number, display_name FROM users WHERE user_id = $1`, [userId]);

  const row = rows[0];
  if (!row) {
    throw new AppError(404, "User not found", "NOT_FOUND");
  }

  return {
    user_id: userId,
    kyc_tier: kycTier,
    phone_number: row.phone_number,
    display_name: row.display_name,
  };
}
```

Replace the `/auth/me` handler body:

```ts
router.get("/auth/me", authenticate, async (req: Request, res: Response) => {
  res.status(200).json(await buildMeResponse(req.userId!, req.kycTier ?? 0));
});
```

Ensure `AppError` is imported in this file; add it if absent:

```ts
import { AppError } from "../middleware/error-handler.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/routes/auth.me.test.ts`

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/auth.ts backend/src/routes/auth.me.test.ts
git commit -m "feat(api): return phone_number and display_name from /auth/me"
```

---

### Task 3: `PATCH /users/me`

**Files:**
- Create: `backend/src/routes/users.ts`
- Create: `backend/src/services/users.ts`
- Create: `backend/src/services/users.test.ts`
- Modify: `backend/src/index.ts:14-21` (import) and `:53-60` (mount)

**Interfaces:**
- Consumes: `users.display_name` (Task 1)
- Produces:
  - `setDisplayName(userId: string, displayName: string): Promise<{ display_name: string }>` from `src/services/users.js`
  - `PATCH /v1/users/me` body `{ display_name: string }` → `200 { display_name: string }`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/users.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const query = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: { query: (...args: unknown[]) => query(...args) },
  getTransactionClient: vi.fn(),
}));

const { setDisplayName } = await import("./users.js");

beforeEach(() => {
  query.mockReset();
});

describe("setDisplayName", () => {
  it("trims surrounding whitespace before storing", async () => {
    query.mockResolvedValue({ rows: [{ display_name: "Ama's Closet" }] });

    const result = await setDisplayName("user-1", "  Ama's Closet  ");

    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "Ama's Closet",
      "user-1",
    ]);
    expect(result.display_name).toBe("Ama's Closet");
  });

  it("rejects a name that is empty once trimmed", async () => {
    await expect(setDisplayName("user-1", "   ")).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a name longer than the column allows", async () => {
    await expect(setDisplayName("user-1", "a".repeat(51))).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects control characters, which a buyer would never see legibly", async () => {
    await expect(setDisplayName("user-1", "Ama Closet")).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it("throws when the user does not exist", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(setDisplayName("ghost", "Ama's Closet")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/users.test.ts`

Expected: FAIL — cannot resolve `./users.js`

- [ ] **Step 3: Write the service**

Create `backend/src/services/users.ts`:

```ts
import { pool } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";

/** Matches the VARCHAR(50) in migration 006. */
const MAX_DISPLAY_NAME = 50;

/**
 * display_name is user-controlled text shown to strangers on a payment link,
 * so it is validated here rather than trusted from the client. Control
 * characters are rejected outright: they cannot render legibly and are a
 * spoofing vector on a screen where a buyer is deciding whether to send money.
 */
export async function setDisplayName(
  userId: string,
  displayName: string,
): Promise<{ display_name: string }> {
  const trimmed = displayName.trim();

  if (trimmed.length === 0) {
    throw new AppError(400, "Display name is required", "VALIDATION_ERROR");
  }

  if (trimmed.length > MAX_DISPLAY_NAME) {
    throw new AppError(
      400,
      `Display name must be ${MAX_DISPLAY_NAME} characters or fewer`,
      "VALIDATION_ERROR",
    );
  }

  // eslint-disable-next-line no-control-regex
  if (/[ -]/.test(trimmed)) {
    throw new AppError(400, "Display name contains invalid characters", "VALIDATION_ERROR");
  }

  const { rows } = await pool.query<{ display_name: string }>(
    `UPDATE users SET display_name = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2
     RETURNING display_name`,
    [trimmed, userId],
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(404, "User not found", "NOT_FOUND");
  }

  return row;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/users.test.ts`

Expected: PASS — 5 tests

- [ ] **Step 5: Write the route**

Create `backend/src/routes/users.ts`:

```ts
import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { setDisplayName } from "../services/users.js";
import { AppError } from "../middleware/error-handler.js";

const router: RouterType = Router();

/**
 * PATCH /users/me — update the caller's own profile.
 * Only display_name is writable. full_name is set by KYC approval at Tier 1
 * and must never be client-writable: it is the name on an identity document.
 */
router.patch("/users/me", authenticate, async (req: Request, res: Response) => {
  const { display_name } = req.body as { display_name?: unknown };

  if (typeof display_name !== "string") {
    throw new AppError(400, "display_name must be a string", "VALIDATION_ERROR");
  }

  const result = await setDisplayName(req.userId!, display_name);

  res.status(200).json(result);
});

export default router;
```

- [ ] **Step 6: Mount the route**

In `backend/src/index.ts`, add the import after the kyc import (line 20):

```ts
import userRoutes from "./routes/users.js";
```

Add the mount after the kyc mount (line 59):

```ts
app.use("/v1", userRoutes);
```

- [ ] **Step 7: Verify the server builds and the suite is green**

Run: `cd backend && npm run typecheck && npm test`

Expected: typecheck silent, full Vitest suite passes.

- [ ] **Step 8: Commit**

```bash
git add backend/src/routes/users.ts backend/src/services/users.ts backend/src/services/users.test.ts backend/src/index.ts
git commit -m "feat(api): add PATCH /users/me for seller display name"
```

---

### Task 4: Client API and the `useAuth` fix

`useAuth`'s query does `return data.user`, but `/auth/me` responds with a flat object — there is no `.user`, so `useAuth().user` from the query is always `undefined`. Nothing downstream can read the phone number until this is fixed.

**Files:**
- Create: `mobile/src/api/users.ts`
- Modify: `mobile/src/types/api.ts` (extend `MeResponse`)
- Modify: `mobile/src/hooks/useAuth.ts:13-19`
- Test: `mobile/src/__tests__/users-api.test.ts` (create)

**Interfaces:**
- Consumes: `PATCH /users/me` (Task 3), `GET /auth/me` (Task 2)
- Produces:
  - `updateDisplayName(displayName: string): Promise<{ display_name: string }>` from `src/api/users.ts`
  - `MeResponse` gains `phone_number: string` and `display_name: string | null`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/__tests__/users-api.test.ts`:

```ts
/**
 * The client is a thin wrapper, so the test pins the contract that matters:
 * the method, the path, and the body key the backend validates on.
 */
import { updateDisplayName } from '../api/users';
import { api } from '../api/client';

jest.mock('../api/client', () => ({
  api: { patch: jest.fn() },
}));

const patch = api.patch as jest.Mock;

beforeEach(() => {
  patch.mockReset();
});

describe('updateDisplayName', () => {
  it('PATCHes the display name to /users/me', async () => {
    patch.mockResolvedValue({ data: { display_name: "Ama's Closet" } });

    const result = await updateDisplayName("Ama's Closet");

    expect(patch).toHaveBeenCalledWith('/users/me', {
      display_name: "Ama's Closet",
    });
    expect(result.display_name).toBe("Ama's Closet");
  });

  it('propagates a rejection rather than swallowing it', async () => {
    patch.mockRejectedValue(new Error('boom'));

    await expect(updateDisplayName('x')).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects node src/__tests__/users-api.test.ts`

Expected: FAIL — cannot find module `../api/users`

- [ ] **Step 3: Write the client**

Create `mobile/src/api/users.ts`:

```ts
/**
 * Users API — the caller's own profile.
 * Only display_name is writable; full_name belongs to KYC approval.
 */
import { api } from './client';

export async function updateDisplayName(
  displayName: string,
): Promise<{ display_name: string }> {
  const { data } = await api.patch<{ display_name: string }>('/users/me', {
    display_name: displayName,
  });
  return data;
}
```

- [ ] **Step 4: Extend the `MeResponse` type**

In `mobile/src/types/api.ts`, find the `MeResponse` interface and add the two fields:

```ts
  phone_number: string;
  display_name: string | null;
```

- [ ] **Step 5: Fix the `useAuth` unwrap bug**

In `mobile/src/hooks/useAuth.ts`, replace the `queryFn` (lines 13-16):

```ts
    queryFn: async () => {
      // /auth/me returns the user object flat, not wrapped in { user }.
      const { data } = await api.get<MeResponse>('/auth/me');
      return data;
    },
```

Add the type import at the top of the file:

```ts
import type { MeResponse } from '../types/api';
```

- [ ] **Step 6: Run tests and typecheck**

Run: `cd mobile && npx jest --selectProjects node src/__tests__/users-api.test.ts && npm run typecheck`

Expected: PASS — 2 tests; typecheck silent.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/api/users.ts mobile/src/types/api.ts mobile/src/hooks/useAuth.ts mobile/src/__tests__/users-api.test.ts
git commit -m "feat(mobile): add users API and fix /auth/me response unwrap"
```

---

### Task 5: Setup progress in the onboarding store

**Files:**
- Modify: `mobile/src/stores/onboarding.ts`
- Test: `mobile/src/__tests__/onboarding-store.test.ts` (extend)

**Interfaces:**
- Consumes: nothing
- Produces: `useOnboardingStore` gains `setupDone: boolean`, `checklistDismissed: boolean`, `completeSetup(): Promise<void>`, `dismissChecklist(): Promise<void>`. Keys `croe.onboarding.setup` and `croe.onboarding.checklist`.

- [ ] **Step 1: Write the failing test**

Add to `mobile/src/__tests__/onboarding-store.test.ts`:

```ts
describe('setup progress', () => {
  it('hydrates setup as incomplete on a fresh install', async () => {
    await useOnboardingStore.getState().hydrate();
    expect(useOnboardingStore.getState().setupDone).toBe(false);
    expect(useOnboardingStore.getState().checklistDismissed).toBe(false);
  });

  it('persists setup completion', async () => {
    await useOnboardingStore.getState().completeSetup();
    expect(useOnboardingStore.getState().setupDone).toBe(true);

    useOnboardingStore.setState({ setupDone: false, hydrated: false });
    await useOnboardingStore.getState().hydrate();

    expect(useOnboardingStore.getState().setupDone).toBe(true);
  });

  it('persists a dismissed checklist', async () => {
    await useOnboardingStore.getState().dismissChecklist();

    useOnboardingStore.setState({ checklistDismissed: false, hydrated: false });
    await useOnboardingStore.getState().hydrate();

    expect(useOnboardingStore.getState().checklistDismissed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects node src/__tests__/onboarding-store.test.ts`

Expected: FAIL — `completeSetup is not a function`

- [ ] **Step 3: Write minimal implementation**

In `mobile/src/stores/onboarding.ts`, add the keys below the existing two:

```ts
const SETUP_KEY = 'croe.onboarding.setup';
const CHECKLIST_KEY = 'croe.onboarding.checklist';
```

Extend the interface:

```ts
  setupDone: boolean;
  checklistDismissed: boolean;
  completeSetup: () => Promise<void>;
  dismissChecklist: () => Promise<void>;
```

Add the initial values beside `seen` / `role`:

```ts
  setupDone: false,
  checklistDismissed: false,
```

Replace the `hydrate` body:

```ts
  hydrate: async () => {
    try {
      const [seen, role, setup, checklist] = await Promise.all([
        SecureStore.getItemAsync(SEEN_KEY),
        SecureStore.getItemAsync(ROLE_KEY),
        SecureStore.getItemAsync(SETUP_KEY),
        SecureStore.getItemAsync(CHECKLIST_KEY),
      ]);
      set({
        seen: seen === 'true',
        role: parseRole(role),
        setupDone: setup === 'true',
        checklistDismissed: checklist === 'true',
        hydrated: true,
      });
    } catch {
      // A read failure must not strand the user on a blank screen. Showing
      // onboarding again is the harmless direction to fail in.
      set({
        seen: false,
        role: null,
        setupDone: false,
        checklistDismissed: false,
        hydrated: true,
      });
    }
  },
```

Add the two actions after `complete`:

```ts
  completeSetup: async () => {
    set({ setupDone: true });
    await SecureStore.setItemAsync(SETUP_KEY, 'true');
  },

  dismissChecklist: async () => {
    set({ checklistDismissed: true });
    await SecureStore.setItemAsync(CHECKLIST_KEY, 'true');
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest --selectProjects node src/__tests__/onboarding-store.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/stores/onboarding.ts mobile/src/__tests__/onboarding-store.test.ts
git commit -m "feat(mobile): track setup progress in onboarding store"
```

---

### Task 6: SetupScreen — display name + payout confirm

**Files:**
- Create: `mobile/src/screens/setup/SetupScreen.tsx`
- Create: `mobile/src/screens/setup/SetupScreen.test.tsx`
- Modify: `mobile/src/screens/onboarding/content.ts` (add `setupCopy`)

**Interfaces:**
- Consumes: `updateDisplayName` (Task 4), `completeSetup` (Task 5), `useAuth().user.phone_number` (Task 4)
- Produces: `SetupScreen` — a route named `Setup` in `AuthStackParamList`. testIDs: `setup-name`, `setup-continue`, `setup-skip`, `setup-payout`.

- [ ] **Step 1: Add the copy**

Append to `mobile/src/screens/onboarding/content.ts`:

```ts
export const setupCopy = {
  title: 'Set up your payments',
  lede: 'Two quick things so buyers know who they are paying, and so your money knows where to land.',
  nameLabel: 'What buyers see',
  namePlaceholder: "e.g. Ama's Closet",
  nameHelper: 'This appears on every payment link you share.',
  payoutLabel: 'Where your money lands',
  payoutNote: 'This is the number you just verified. Payouts go here.',
  cta: 'Continue',
  skip: 'Set up later',
} as const;

/**
 * Masks the middle of an E.164 Ghanaian number for display: +233241234567
 * becomes 024 ••• 4567. The last four digits are kept because that is what a
 * seller checks a number by; the middle is masked because this screen may be
 * read over someone's shoulder.
 */
export function maskMsisdn(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  const local = digits.startsWith('233') ? `0${digits.slice(3)}` : digits;
  if (local.length < 7) return local;
  return `${local.slice(0, 3)} ••• ${local.slice(-4)}`;
}
```

- [ ] **Step 2: Write the failing test**

Create `mobile/src/screens/setup/SetupScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SetupScreen } from './SetupScreen';
import { setupCopy, maskMsisdn } from '../onboarding/content';
import { useOnboardingStore } from '../../stores/onboarding';
import { updateDisplayName } from '../../api/users';

const replace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace }),
}));

jest.mock('../../api/users', () => ({
  updateDisplayName: jest.fn(),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { phone_number: '+233241234567' } }),
}));

const mockUpdate = updateDisplayName as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue({ display_name: "Ama's Closet" });
  useOnboardingStore.setState({ setupDone: false, checklistDismissed: false });
});

describe('maskMsisdn', () => {
  it('masks the middle of a Ghanaian number', () => {
    expect(maskMsisdn('+233241234567')).toBe('024 ••• 4567');
  });
});

describe('SetupScreen', () => {
  it('shows the verified number as the payout destination', () => {
    render(<SetupScreen />);
    expect(screen.getByTestId('setup-payout')).toHaveTextContent('024 ••• 4567');
  });

  it('does not submit an empty name', () => {
    render(<SetupScreen />);
    fireEvent.press(screen.getByTestId('setup-continue'));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves the name, marks setup done and lands on Home', async () => {
    render(<SetupScreen />);

    fireEvent.changeText(screen.getByTestId('setup-name'), "Ama's Closet");
    fireEvent.press(screen.getByTestId('setup-continue'));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith("Ama's Closet"),
    );
    await waitFor(() =>
      expect(useOnboardingStore.getState().setupDone).toBe(true),
    );
    expect(replace).toHaveBeenCalledWith('Main');
  });

  it('leaves setup outstanding when skipped', async () => {
    render(<SetupScreen />);

    fireEvent.press(screen.getByTestId('setup-skip'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Main'));
    expect(useOnboardingStore.getState().setupDone).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps the seller on the screen when the save fails', async () => {
    mockUpdate.mockRejectedValue(new Error('offline'));
    render(<SetupScreen />);

    fireEvent.changeText(screen.getByTestId('setup-name'), "Ama's Closet");
    fireEvent.press(screen.getByTestId('setup-continue'));

    await waitFor(() => expect(screen.getByText(setupCopy.cta)).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().setupDone).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/screens/setup/SetupScreen.test.tsx`

Expected: FAIL — cannot find module `./SetupScreen`

- [ ] **Step 4: Write the screen**

Create `mobile/src/screens/setup/SetupScreen.tsx`:

```tsx
/**
 * SetupScreen — display name and payout confirmation, on one screen.
 *
 * One screen rather than two: each half takes about ten seconds, and split
 * they would put a seller at nine screens before their first link.
 *
 * The payout half is a read-back, not a field. users.phone_number is the
 * documented MoMo identifier and it was just verified by OTP; an editable
 * payout number would mean a second verification path and a divergence
 * between the number that authenticates and the number that receives money.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  surfaces,
  ink as inkColors,
  line,
  states,
  shape,
  layout,
  space,
} from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Button } from '../../theme/components/Button';
import { Input } from '../../theme/components/Input';
import { Check } from '../../theme/components/icons';
import { useOnboardingStore } from '../../stores/onboarding';
import { useAuth } from '../../hooks/useAuth';
import { updateDisplayName } from '../../api/users';
import { friendlyError } from '../../api/client';
import { setupCopy, maskMsisdn } from '../onboarding/content';
import { Wordmark } from '../onboarding/chrome';

type Nav = NativeStackNavigationProp<Record<string, undefined>>;

export function SetupScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const completeSetup = useOnboardingStore((s) => s.completeSetup);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const phone = user?.phone_number ?? '';

  const handleContinue = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Please enter a name buyers will recognise.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(trimmed);
      await completeSetup();
      navigation.replace('Main');
    } catch (err) {
      // Staying on the screen is the correct failure direction: advancing
      // would leave a seller believing a name was saved that was not.
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }, [name, completeSetup, navigation]);

  // Skip leaves setupDone false, so the Home checklist still shows both items.
  const handleSkip = useCallback(() => {
    navigation.replace('Main');
  }, [navigation]);

  return (
    <View style={styles.root}>
      <View style={[styles.topbar, { paddingTop: insets.top + space.s1 }]}>
        <Wordmark />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: space.s6 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={typography.title}>{setupCopy.title}</Text>
          <Text style={styles.lede}>{setupCopy.lede}</Text>
        </View>

        <View testID="setup-name-field">
          <Input
            value={name}
            onChangeText={(text: string) => {
              setName(text);
              if (error) setError(null);
            }}
            label={setupCopy.nameLabel}
            placeholder={setupCopy.namePlaceholder}
            helper={setupCopy.nameHelper}
            error={error ?? undefined}
          />
        </View>

        <View>
          <Text style={styles.fieldLabel}>{setupCopy.payoutLabel}</Text>
          <View style={styles.payout}>
            <View style={styles.payoutMark}>
              <Check size={19} color={states.secure.on} />
            </View>
            <View style={styles.payoutWho}>
              <Text testID="setup-payout" style={styles.payoutNumber}>
                {maskMsisdn(phone)}
              </Text>
              <Text style={styles.payoutNote}>{setupCopy.payoutNote}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.foot}>
          <Button
            testID="setup-continue"
            title={setupCopy.cta}
            variant="ink"
            fullWidth
            disabled={saving}
            onPress={handleContinue}
          />
          <Pressable
            testID="setup-skip"
            accessibilityRole="button"
            accessibilityLabel={setupCopy.skip}
            hitSlop={space.s3}
            onPress={handleSkip}
          >
            <Text style={styles.skip}>{setupCopy.skip}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surfaces.canvas },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.s2,
  },
  body: {
    flexGrow: 1,
    paddingTop: space.s2,
    paddingHorizontal: layout.gutter,
    gap: layout.gapSection,
  },
  lede: {
    ...typography.body,
    color: inkColors.secondary,
    marginTop: space.s2,
  },
  fieldLabel: {
    ...typography.label,
    color: inkColors.secondary,
    marginBottom: space.s2,
  },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
    padding: space.s4,
  },
  payoutMark: {
    width: 44,
    height: 44,
    borderRadius: shape.full,
    backgroundColor: states.secure.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutWho: { flex: 1, minWidth: 0 },
  payoutNumber: {
    ...typography.subhead,
    color: inkColors.primary,
    fontVariant: ['tabular-nums'],
  },
  payoutNote: {
    ...typography.caption,
    color: inkColors.tertiary,
    marginTop: space.s1,
  },
  spacer: { flex: 1, minHeight: space.s6 },
  foot: { gap: space.s3, alignItems: 'stretch' },
  skip: {
    ...typography.label,
    color: inkColors.tertiary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 5: Confirm the `Check` icon exists**

Run: `cd mobile && grep -n "export function Check" src/theme/components/icons.tsx`

Expected: a match. If there is none, add a Feather shim following the existing convention in that file, matching how `Shield` is defined.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd mobile && npx jest --selectProjects components src/screens/setup/SetupScreen.test.tsx`

Expected: PASS — 6 tests

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/setup/ mobile/src/screens/onboarding/content.ts
git commit -m "feat(mobile): add Setup screen for display name and payout confirm"
```

---

### Task 7: Role branching

The role answer stops being cosmetic. Sellers route through Setup; buyers do not.

**Files:**
- Modify: `mobile/src/navigation/AuthStack.tsx`
- Modify: `mobile/src/screens/onboarding/RoleSelectScreen.tsx:64-68`
- Modify: `mobile/src/screens/auth/OtpEntryScreen.tsx` (post-verify destination)
- Test: `mobile/src/screens/onboarding/RoleSelectScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: `SetupScreen` (Task 6), `useOnboardingStore.role` and `.setupDone` (Task 5)
- Produces: `AuthStackParamList` gains `Setup: undefined`. `nextAfterAuth(role, setupDone): 'Setup' | 'Main'` exported from `src/navigation/destinations.ts`.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/__tests__/destinations.test.ts`:

```ts
import { nextAfterAuth } from '../navigation/destinations';

describe('nextAfterAuth', () => {
  it('sends a seller who has not set up to Setup', () => {
    expect(nextAfterAuth('seller', false)).toBe('Setup');
  });

  it('sends a seller who has set up straight to the app', () => {
    expect(nextAfterAuth('seller', true)).toBe('Main');
  });

  it('never sends a buyer to seller setup', () => {
    expect(nextAfterAuth('buyer', false)).toBe('Main');
  });

  it('treats an unanswered role as a seller, matching the tab default', () => {
    expect(nextAfterAuth(null, false)).toBe('Setup');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects node src/__tests__/destinations.test.ts`

Expected: FAIL — cannot find module `../navigation/destinations`

- [ ] **Step 3: Write the destination helper**

Create `mobile/src/navigation/destinations.ts`:

```ts
/**
 * Where a user lands once their number is verified.
 *
 * A null role means onboarding was skipped. That is treated as a seller,
 * matching MainTabs' existing default of opening on Home — a skipper is more
 * likely to be a vendor than a buyer, and a buyer can leave Setup with one tap.
 */
import type { OnboardingRole } from '../stores/onboarding';

export type PostAuthRoute = 'Setup' | 'Main';

export function nextAfterAuth(
  role: OnboardingRole | null,
  setupDone: boolean,
): PostAuthRoute {
  if (role === 'buyer') return 'Main';
  return setupDone ? 'Main' : 'Setup';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest --selectProjects node src/__tests__/destinations.test.ts`

Expected: PASS — 4 tests

- [ ] **Step 5: Register the Setup route**

In `mobile/src/navigation/AuthStack.tsx`, add the import:

```tsx
import { SetupScreen } from '../screens/setup/SetupScreen';
```

Add to `AuthStackParamList`:

```tsx
  Setup: undefined;
```

Add the screen inside the navigator, after `RoleSelect`:

```tsx
      <Stack.Screen name="Setup" component={SetupScreen} />
```

- [ ] **Step 6: Route from OTP verification**

In `mobile/src/screens/auth/OtpEntryScreen.tsx`, find the call that navigates after a successful verification and replace the destination with the computed one. Add the imports:

```tsx
import { nextAfterAuth } from '../../navigation/destinations';
import { useOnboardingStore } from '../../stores/onboarding';
```

Read the two values inside the component:

```tsx
  const role = useOnboardingStore((s) => s.role);
  const setupDone = useOnboardingStore((s) => s.setupDone);
```

Replace the post-verify navigation with:

```tsx
      navigation.replace(nextAfterAuth(role, setupDone));
```

If `OtpEntryScreen` currently relies on `RootNavigator` swapping stacks on `isAuthenticated` rather than navigating itself, leave that mechanism in place and instead gate the swap: `RootNavigator` renders `MainStack` only when `nextAfterAuth(role, setupDone) === 'Main'`, and renders `AuthStack` with `initialRouteName="Setup"` otherwise. Choose whichever matches the existing code; do not introduce a second navigation mechanism.

- [ ] **Step 7: Extend the role-select test**

Add to `mobile/src/screens/onboarding/RoleSelectScreen.test.tsx`:

```tsx
  it('records the buyer role when buying is chosen', async () => {
    render(<RoleSelectScreen />);

    fireEvent.press(screen.getByTestId('role-option-buyer'));
    fireEvent.press(screen.getByTestId('role-continue'));

    await waitFor(() =>
      expect(useOnboardingStore.getState().role).toBe('buyer'),
    );
  });
```

- [ ] **Step 8: Run the suite and typecheck**

Run: `cd mobile && npm test && npm run typecheck`

Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add mobile/src/navigation/ mobile/src/screens/auth/OtpEntryScreen.tsx mobile/src/screens/onboarding/RoleSelectScreen.test.tsx mobile/src/__tests__/destinations.test.ts
git commit -m "feat(mobile): branch post-auth destination on onboarding role"
```

---

### Task 8: Home setup checklist

**Files:**
- Create: `mobile/src/components/SetupChecklist.tsx`
- Create: `mobile/src/components/SetupChecklist.test.tsx`
- Modify: `mobile/src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useOnboardingStore` `setupDone` / `checklistDismissed` / `dismissChecklist` (Task 5), `useAuth().user.display_name` (Task 4)
- Produces: `<SetupChecklist />` — renders nothing when dismissed or when every item is complete. testIDs: `setup-checklist`, `setup-checklist-dismiss`, `setup-checklist-item-<key>`.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/SetupChecklist.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SetupChecklist } from './SetupChecklist';
import { useOnboardingStore } from '../stores/onboarding';

const navigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate }),
}));

let mockUser: { display_name: string | null } | null = { display_name: null };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { display_name: null };
  useOnboardingStore.setState({ setupDone: false, checklistDismissed: false });
});

describe('SetupChecklist', () => {
  it('shows outstanding items to a seller who skipped setup', () => {
    render(<SetupChecklist />);
    expect(screen.getByTestId('setup-checklist')).toBeTruthy();
    expect(screen.getByTestId('setup-checklist-item-name')).toBeTruthy();
  });

  it('renders nothing once dismissed', () => {
    useOnboardingStore.setState({ checklistDismissed: true });
    render(<SetupChecklist />);
    expect(screen.queryByTestId('setup-checklist')).toBeNull();
  });

  it('renders nothing when every item is done', () => {
    mockUser = { display_name: "Ama's Closet" };
    useOnboardingStore.setState({ setupDone: true });
    render(<SetupChecklist />);
    expect(screen.queryByTestId('setup-checklist')).toBeNull();
  });

  it('persists a dismissal', async () => {
    render(<SetupChecklist />);
    fireEvent.press(screen.getByTestId('setup-checklist-dismiss'));
    await waitFor(() =>
      expect(useOnboardingStore.getState().checklistDismissed).toBe(true),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/components/SetupChecklist.test.tsx`

Expected: FAIL — cannot find module `./SetupChecklist`

- [ ] **Step 3: Write the component**

Create `mobile/src/components/SetupChecklist.tsx`:

```tsx
/**
 * SetupChecklist — the recovery path for a seller who skipped Setup, and the
 * nudge toward a first link.
 *
 * Renders nothing when there is nothing outstanding, so a fully set-up seller
 * never sees dead chrome on Home.
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  surfaces,
  ink as inkColors,
  line,
  states,
  shape,
  space,
} from '../theme/tokens';
import { typography } from '../theme/typography';
import { Check, Plus, X } from '../theme/components/icons';
import { useOnboardingStore } from '../stores/onboarding';
import { useAuth } from '../hooks/useAuth';

type Nav = NativeStackNavigationProp<Record<string, undefined>>;

interface Item {
  key: string;
  label: string;
  done: boolean;
  route: string;
}

export function SetupChecklist() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const setupDone = useOnboardingStore((s) => s.setupDone);
  const dismissed = useOnboardingStore((s) => s.checklistDismissed);
  const dismissChecklist = useOnboardingStore((s) => s.dismissChecklist);

  const items: Item[] = [
    {
      key: 'name',
      label: 'Add the name buyers see',
      done: Boolean(user?.display_name) || setupDone,
      route: 'Setup',
    },
    {
      key: 'link',
      label: 'Create your first payment link',
      done: false,
      route: 'CreateEscrow',
    },
  ];

  const outstanding = items.filter((i) => !i.done);

  const handleDismiss = useCallback(() => {
    dismissChecklist();
  }, [dismissChecklist]);

  if (dismissed || outstanding.length === 0) return null;

  return (
    <View testID="setup-checklist" style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Finish setting up</Text>
        <Pressable
          testID="setup-checklist-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Dismiss setup checklist"
          hitSlop={space.s3}
          onPress={handleDismiss}
        >
          <X size={18} color={inkColors.tertiary} />
        </Pressable>
      </View>

      {items.map((item) => (
        <Pressable
          key={item.key}
          testID={`setup-checklist-item-${item.key}`}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          disabled={item.done}
          onPress={() => navigation.navigate(item.route)}
          style={styles.row}
        >
          <View style={[styles.mark, item.done && styles.markDone]}>
            {item.done ? (
              <Check size={14} color={states.secure.on} />
            ) : (
              <Plus size={14} color={inkColors.secondary} />
            )}
          </View>
          <Text style={[styles.label, item.done && styles.labelDone]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: space.s5,
    gap: space.s3,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.heading, color: inkColors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  mark: {
    width: 26,
    height: 26,
    borderRadius: shape.full,
    borderWidth: 1,
    borderColor: line.primary,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: {
    backgroundColor: states.secure.fill,
    borderColor: states.secure.fill,
  },
  label: { ...typography.subhead, color: inkColors.primary, flex: 1 },
  labelDone: { color: inkColors.tertiary },
});
```

- [ ] **Step 4: Confirm the icons exist**

Run: `cd mobile && grep -n "export function \(Check\|Plus\|X\)\b" src/theme/components/icons.tsx`

Expected: three matches. Add any missing shim following the existing Feather convention in that file.

- [ ] **Step 5: Mount it on Home**

In `mobile/src/screens/HomeScreen.tsx`, add the import:

```tsx
import { SetupChecklist } from '../components/SetupChecklist';
```

Render it inside the `ScrollView`, directly above the transaction list and below the balance block:

```tsx
        <SetupChecklist />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd mobile && npx jest --selectProjects components src/components/SetupChecklist.test.tsx`

Expected: PASS — 4 tests

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/SetupChecklist.tsx mobile/src/components/SetupChecklist.test.tsx mobile/src/screens/HomeScreen.tsx
git commit -m "feat(mobile): add Home setup checklist"
```

---

### Task 9: KYC screen, reached just-in-time

`src/api/kyc.ts` already provides `submitKyc(idType, imageUri)` and `getKycStatus()`, and `friendlyError` already maps `KYC_LIMIT_EXCEEDED` and `FILE_TOO_LARGE`. This task is the screen, the picker, and the downscale.

**Files:**
- Create: `mobile/src/screens/kyc/KycScreen.tsx`
- Create: `mobile/src/screens/kyc/KycScreen.test.tsx`
- Modify: `mobile/package.json` (two dependencies)

**Interfaces:**
- Consumes: `submitKyc`, `getKycStatus` from `src/api/kyc.ts`; `KycIdType` from `src/types/api.ts`
- Produces: `KycScreen` — route `Kyc`. testIDs: `kyc-type-<NATIONAL_ID|PASSPORT|VOTER_ID>`, `kyc-pick`, `kyc-submit`, `kyc-pending`.

- [ ] **Step 1: Add the dependencies**

Run: `cd mobile && npx expo install expo-image-picker expo-image-manipulator`

Expected: both added to `dependencies` at Expo-54-compatible versions. `expo-image-manipulator` is not optional — the backend accepts up to 10 MB and does no resizing, and a raw phone photo on prepaid Ghanaian data is the same failure the SPEC art budget exists to prevent.

- [ ] **Step 2: Write the failing test**

Create `mobile/src/screens/kyc/KycScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { KycScreen } from './KycScreen';
import { submitKyc } from '../../api/kyc';

const goBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack }),
}));

jest.mock('../../api/kyc', () => ({
  submitKyc: jest.fn(),
  getKycStatus: jest.fn().mockResolvedValue({ tier: 0, status: 'VERIFIED' }),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///id.jpg' }],
  }),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///id-small.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

const mockSubmit = submitKyc as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue({ kyc_id: 'k1', status: 'PENDING' });
});

describe('KycScreen', () => {
  it('will not submit before a document is captured', () => {
    render(<KycScreen />);
    fireEvent.press(screen.getByTestId('kyc-submit'));
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('downscales the image before uploading it', async () => {
    const { manipulateAsync } = jest.requireMock('expo-image-manipulator');
    render(<KycScreen />);

    fireEvent.press(screen.getByTestId('kyc-pick'));

    await waitFor(() => expect(manipulateAsync).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('kyc-submit'));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith('NATIONAL_ID', 'file:///id-small.jpg'),
    );
  });

  it('shows the pending state after a successful submit', async () => {
    render(<KycScreen />);

    fireEvent.press(screen.getByTestId('kyc-pick'));
    await waitFor(() => expect(screen.getByTestId('kyc-submit')).toBeTruthy());
    fireEvent.press(screen.getByTestId('kyc-submit'));

    await waitFor(() => expect(screen.getByTestId('kyc-pending')).toBeTruthy());
  });

  it('surfaces a friendly message when the file is rejected as too large', async () => {
    mockSubmit.mockRejectedValue({
      isAxiosError: true,
      response: { status: 413, data: { error: 'FILE_TOO_LARGE' } },
    });
    render(<KycScreen />);

    fireEvent.press(screen.getByTestId('kyc-pick'));
    await waitFor(() => expect(screen.getByTestId('kyc-submit')).toBeTruthy());
    fireEvent.press(screen.getByTestId('kyc-submit'));

    await waitFor(() =>
      expect(screen.getByText(/too large/i)).toBeTruthy(),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/screens/kyc/KycScreen.test.tsx`

Expected: FAIL — cannot find module `./KycScreen`

- [ ] **Step 4: Write the screen**

Create `mobile/src/screens/kyc/KycScreen.tsx`:

```tsx
/**
 * KycScreen — Tier 0 to Tier 1.
 *
 * Reached just-in-time, never on first run: a seller meets this only when an
 * amount exceeds their tier cap, so the screen always has a reason to exist.
 *
 * The captured image is downscaled before upload. The backend accepts 10 MB
 * and does no resizing; uploading a raw phone photo would cost a prepaid user
 * real money to clear a limit they only just discovered.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  surfaces,
  ink as inkColors,
  line,
  states,
  shape,
  layout,
  space,
} from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Button } from '../../theme/components/Button';
import { WashBanner } from '../../theme/components/WashBanner';
import { Info } from '../../theme/components/icons';
import { submitKyc } from '../../api/kyc';
import { friendlyError } from '../../api/client';
import type { KycIdType } from '../../types/api';

/** 1600px on the long edge is legible for manual review and lands well under
 *  the 10 MB ceiling on any phone. */
const MAX_EDGE = 1600;

const ID_TYPES: Array<{ value: KycIdType; label: string }> = [
  { value: 'NATIONAL_ID', label: 'Ghana Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'VOTER_ID', label: "Voter's ID" },
];

export function KycScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [idType, setIdType] = useState<KycIdType>('NATIONAL_ID');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);

  const handlePick = useCallback(async () => {
    setError(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Croe needs camera access to photograph your ID.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    const shrunk = await manipulateAsync(
      asset.uri,
      [{ resize: { width: MAX_EDGE } }],
      { compress: 0.7, format: SaveFormat.JPEG },
    );

    setImageUri(shrunk.uri);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!imageUri) {
      setError('Please photograph your ID first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitKyc(idType, imageUri);
      setPending(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }, [idType, imageUri]);

  if (pending) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.s6 }]}>
        <View style={styles.body} testID="kyc-pending">
          <Text style={typography.title}>We're checking your ID</Text>
          <Text style={styles.lede}>
            This usually takes a few hours. We'll let you know the moment your
            limit goes up — you can keep selling under your current limit in the
            meantime.
          </Text>
          <View style={styles.spacer} />
          <Button
            title="Back to selling"
            variant="ink"
            fullWidth
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.s4, paddingBottom: space.s6 + insets.bottom },
        ]}
      >
        <View>
          <Text style={typography.title}>Raise your limit</Text>
          <Text style={styles.lede}>
            Photograph an ID and we'll lift the cap on what you can sell in one
            go. Your document is reviewed by a person and never leaves Croe.
          </Text>
        </View>

        <View style={styles.types}>
          {ID_TYPES.map((type) => {
            const selected = type.value === idType;
            return (
              <Pressable
                key={type.value}
                testID={`kyc-type-${type.value}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={type.label}
                onPress={() => setIdType(type.value)}
                style={[styles.type, selected && styles.typeSelected]}
              >
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          testID="kyc-pick"
          title={imageUri ? 'Retake photo' : 'Photograph your ID'}
          variant={imageUri ? 'line' : 'wash'}
          fullWidth
          onPress={handlePick}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <WashBanner
          variant="secure"
          title="Why we ask"
          body="Ghanaian rules require us to verify identity before larger amounts move. It is a one-time step."
          icon={<Info size={19} color={states.secure.deep} />}
        />

        <View style={styles.spacer} />

        <Button
          testID="kyc-submit"
          title="Submit for review"
          variant="ink"
          fullWidth
          disabled={submitting}
          onPress={handleSubmit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surfaces.canvas },
  body: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    gap: layout.gapSection,
  },
  lede: { ...typography.body, color: inkColors.secondary, marginTop: space.s2 },
  types: { flexDirection: 'row', gap: space.s2 },
  type: {
    flex: 1,
    paddingVertical: space.s3,
    borderRadius: shape.r2,
    borderWidth: 1,
    borderColor: line.primary,
    backgroundColor: surfaces.surface,
    alignItems: 'center',
  },
  typeSelected: {
    borderColor: inkColors.primary,
    backgroundColor: inkColors.primary,
  },
  typeLabel: { ...typography.label, color: inkColors.primary },
  typeLabelSelected: { color: inkColors.onInk },
  error: { ...typography.caption, color: states.danger.deep },
  spacer: { flex: 1, minHeight: space.s6 },
});
```

- [ ] **Step 5: Register the route and the trigger**

Add `Kyc` to `MainStack`'s param list and screens, following how `CreateEscrow` is registered in `mobile/src/navigation/MainStack.tsx`.

In `mobile/src/screens/CreateEscrowScreen.tsx`, catch the tier rejection and offer the upgrade. Where the create call's error is handled, add:

```tsx
      const code = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      if (code === 'KYC_LIMIT_EXCEEDED') {
        navigation.navigate('Kyc');
        return;
      }
```

This is the only path to the KYC screen. It is never reachable from first-run onboarding.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd mobile && npx jest --selectProjects components src/screens/kyc/KycScreen.test.tsx`

Expected: PASS — 4 tests

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/kyc/ mobile/src/navigation/MainStack.tsx mobile/src/screens/CreateEscrowScreen.tsx mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add just-in-time KYC screen with client-side downscale"
```

---

### Task 10: Full verification

**Files:**
- Modify: `mobile/e2e/onboarding-flow.test.ts`

**Interfaces:**
- Consumes: everything above
- Produces: nothing

- [ ] **Step 1: Run both suites**

Run: `cd backend && npm test` then `cd ../mobile && npm test`

Expected: both green, no pre-existing test regressed.

- [ ] **Step 2: Typecheck both**

Run: `cd backend && npm run typecheck` then `cd ../mobile && npm run typecheck`

Expected: silent, exit 0 for both.

- [ ] **Step 3: Extend the Detox journey**

Add to `mobile/e2e/onboarding-flow.test.ts` a case that walks a fresh install through the seller path: three panels, role select with selling, phone, OTP, Setup, and asserts Home shows the checklist with the first-link item outstanding. Add a second case that takes the buyer path and asserts Setup is never shown.

- [ ] **Step 4: Verify the blocking dependency before release**

Run: `cd backend && grep -n 'unknown' src/services/escrow.ts`

Expected: **no match on lines 533 or 655.** If `vendorMsisdn: "unknown"` is still present, the Setup screen's payout promise is not yet true and this plan must not ship to users. Task 6 is built but held.

- [ ] **Step 5: Commit**

```bash
git add mobile/e2e/onboarding-flow.test.ts
git commit -m "test(mobile): cover seller and buyer activation journeys in e2e"
```

---

## Self-Review

**Spec coverage.** Payout confirm → Task 6. Display name → Tasks 1, 3, 4, 6. First link → Task 8. KYC → Task 9. Role branching → Task 7. `display_name`/`full_name` split → Tasks 1, 3. Blocking dependency → stated at the top and re-checked in Task 10 Step 4.

**Additions beyond the spec, and why.** Task 2 (`/auth/me` fields) and the `useAuth` unwrap fix in Task 4 were not in the spec. Both are prerequisites discovered while reading the code: the Setup screen cannot display a payout number the client cannot fetch, and `useAuth().user` is currently always `undefined` from the query because it unwraps a `.user` key the endpoint does not return.

**Type consistency.** `setDisplayName(userId, displayName)` is defined in Task 3 and consumed by the route in the same task. `updateDisplayName(displayName)` is defined in Task 4 and consumed in Task 6. `nextAfterAuth(role, setupDone)` is defined in Task 7 and consumed there. `MeResponse` gains `phone_number` and `display_name` in Task 4 and both are read in Tasks 6 and 8. `submitKyc(idType, imageUri)` matches the existing signature in `src/api/kyc.ts`.

**Known soft spot.** Task 7 Step 6 offers two mechanisms because `OtpEntryScreen`'s current post-verify behaviour was not read line-by-line — it may navigate directly or rely on `RootNavigator` swapping stacks on `isAuthenticated`. The step says to match whichever exists rather than introducing a second mechanism. The implementer must read that file first.

**Checklist item honesty.** Task 8's "Create your first payment link" item is hardcoded `done: false`. Wiring it to a real "has the seller ever created a link" signal needs an escrow-list query that is out of this plan's scope; the item therefore always shows until the checklist is dismissed. This is a deliberate, stated limitation rather than an oversight.
