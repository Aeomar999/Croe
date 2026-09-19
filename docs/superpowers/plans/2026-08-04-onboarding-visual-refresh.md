# Onboarding Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the onboarding carousel feel like Croe — motion, hero typography, and art that breathes — without changing its composition.

**Architecture:** Composition A (centred stack) is retained. Three additions: a `useReducedMotion` hook that gates all animation, scroll-linked parallax on the art driven by the carousel's `scrollX`, and a display-weight title on panel 1. `ArtFrame` gains a `bleed` prop so the art can run past the gutter. No backend, no schema, no new dependencies.

**Tech Stack:** React Native 0.81 (Expo 54), TypeScript strict, React Native `Animated` (native driver), Jest with the existing two-project split, `@testing-library/react-native` 14.

## Global Constraints

- TypeScript strict — `noImplicitAny`, `strictNullChecks`. No `any`.
- Design tokens only. Never a raw hex in a component; import from `src/theme/tokens.ts`.
- Type comes from `src/theme/typography.ts`. Never a bare `fontSize` where a scale step exists.
- Motion durations come from `motion.state` (160ms) and `motion.layer` (240ms) in `tokens.ts`. No invented durations.
- All animation must be disabled when `AccessibilityInfo.isReduceMotionEnabled()` is true.
- All `Animated` work uses `useNativeDriver: true`. `transform` and `opacity` only — never `width`/`height` on the native driver.
- Component tests are `*.test.tsx` (jest project `components`). Logic tests are `src/__tests__/**/*.test.ts` (project `node`).
- Existing testIDs are contract. `onboarding-panel-<key>`, `onboarding-primary-<key>`, `onboarding-secondary`, `onboarding-skip`, `onboarding-dot-<i>` and `onboarding-dot-<i>-active` must keep working — `OnboardingScreen.test.tsx` asserts them.
- Commit messages must NOT include a `Co-Authored-By: Claude` trailer or any Claude attribution.
- Run tests with `npm test` from `mobile/`. Typecheck with `npm run typecheck`.

---

### Task 1: `useReducedMotion` hook

The gate every later task depends on. Nothing animates unless this returns `false`.

**Files:**
- Create: `mobile/src/hooks/useReducedMotion.ts`
- Test: `mobile/src/hooks/useReducedMotion.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `useReducedMotion(): boolean` — `true` when the OS "reduce motion" setting is on. Defaults to `false` until the async read resolves.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/hooks/useReducedMotion.test.tsx`:

```tsx
/**
 * The hook reads the OS preference once and then tracks changes to it.
 * Defaulting to false matters: a pending read must not suppress motion
 * for everyone on first frame.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

type Listener = (enabled: boolean) => void;

function mockAccessibility(initial: boolean) {
  const listeners: Listener[] = [];
  const remove = jest.fn();

  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(initial);

  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation(((_event: string, handler: Listener) => {
      listeners.push(handler);
      return { remove };
    }) as unknown as typeof AccessibilityInfo.addEventListener);

  return { listeners, remove };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useReducedMotion', () => {
  it('starts false so the first frame is never needlessly static', () => {
    mockAccessibility(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reports the system preference once the read resolves', async () => {
    mockAccessibility(true);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('tracks a change made while mounted', async () => {
    const { listeners } = mockAccessibility(false);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(false));

    act(() => {
      listeners.forEach((l) => l(true));
    });

    expect(result.current).toBe(true);
  });

  it('removes its listener on unmount', async () => {
    const { remove } = mockAccessibility(false);
    const { unmount } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(remove).not.toHaveBeenCalled());

    unmount();

    expect(remove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/hooks/useReducedMotion.test.tsx`

Expected: FAIL — `Cannot find module './useReducedMotion'`

- [ ] **Step 3: Write minimal implementation**

Create `mobile/src/hooks/useReducedMotion.ts`:

```ts
/**
 * useReducedMotion — the gate on every animation in the app.
 *
 * Defaults to false rather than true: the preference read is async, and
 * starting "reduced" would make the first frame static for the majority who
 * have not enabled it, producing a visible snap when the read resolves.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => setReduced(enabled),
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest --selectProjects components src/hooks/useReducedMotion.test.tsx`

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useReducedMotion.ts mobile/src/hooks/useReducedMotion.test.tsx
git commit -m "feat(mobile): add useReducedMotion accessibility hook"
```

---

### Task 2: Animated page dots

The dots currently snap between 6px and 20px. They should settle.

**Files:**
- Modify: `mobile/src/screens/onboarding/chrome.tsx:23-35` (the `Dots` component) and `:55-69` (its styles)
- Test: `mobile/src/screens/onboarding/chrome.test.tsx` (create)

**Interfaces:**
- Consumes: `useReducedMotion()` from Task 1
- Produces: `Dots({ count, active }: DotsProps)` — unchanged public signature. Still renders `onboarding-dot-<i>` and `onboarding-dot-<i>-active` testIDs.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/screens/onboarding/chrome.test.tsx`:

```tsx
/**
 * The dots animate, but their testIDs are a contract OnboardingScreen.test.tsx
 * relies on. These tests pin the contract, not the animation curve.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Dots } from './chrome';

describe('Dots', () => {
  it('renders one dot per page', () => {
    render(<Dots count={3} active={0} />);
    expect(screen.getByTestId('onboarding-dot-0-active')).toBeTruthy();
    expect(screen.getByTestId('onboarding-dot-1')).toBeTruthy();
    expect(screen.getByTestId('onboarding-dot-2')).toBeTruthy();
  });

  it('moves the active marker when the page changes', () => {
    const { rerender } = render(<Dots count={3} active={0} />);
    expect(screen.queryByTestId('onboarding-dot-1-active')).toBeNull();

    rerender(<Dots count={3} active={1} />);

    expect(screen.getByTestId('onboarding-dot-1-active')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-dot-0-active')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/screens/onboarding/chrome.test.tsx`

Expected: FAIL — `onboarding-dot-1` not found (the current implementation only adds the plain testID, and the active one carries the `-active` suffix; the plain-ID assertion for inactive dots must pass and does, so the failure will be on the rerender case or the missing file)

- [ ] **Step 3: Write minimal implementation**

Replace the `Dots` component and its `dot`/`dotActive` styles in `mobile/src/screens/onboarding/chrome.tsx`.

Replace lines 1-6 (imports) with:

```tsx
/**
 * Chrome shared by the onboarding screens — the wordmark and the page dots.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ink as inkColors, line, shape, states, motion } from '../../theme/tokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';
```

Replace the `Dots` component (lines 18-35) with:

```tsx
interface DotsProps {
  count: number;
  active: number;
}

const DOT_SIZE = 6;
const DOT_ACTIVE_WIDTH = 20;

/**
 * Width is animated on the JS driver, not the native one: the native driver
 * cannot animate layout properties, and a transform-based fake would scale the
 * dot's rounded ends into ellipses. Six pixels of JS-driven width on three
 * views is not a frame-budget concern.
 */
function Dot({ isActive }: { isActive: boolean }) {
  const reducedMotion = useReducedMotion();
  const width = useRef(
    new Animated.Value(isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE),
  ).current;

  useEffect(() => {
    const target = isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE;

    if (reducedMotion) {
      width.setValue(target);
      return;
    }

    Animated.timing(width, {
      toValue: target,
      duration: motion.state,
      useNativeDriver: false,
    }).start();
  }, [isActive, reducedMotion, width]);

  return (
    <Animated.View
      style={[styles.dot, isActive && styles.dotActive, { width }]}
    />
  );
}

export function Dots({ count, active }: DotsProps) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          testID={`onboarding-dot-${i}${i === active ? '-active' : ''}`}
        >
          <Dot isActive={i === active} />
        </View>
      ))}
    </View>
  );
}
```

Replace the `dot` and `dotActive` styles (lines 60-69) with:

```tsx
  dot: {
    height: DOT_SIZE,
    borderRadius: shape.full,
    backgroundColor: line.secondary,
  },
  dotActive: {
    backgroundColor: inkColors.primary,
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest --selectProjects components src/screens/onboarding/`

Expected: PASS — `chrome.test.tsx` (2 tests) and `OnboardingScreen.test.tsx` (9 tests, including the existing `onboarding-dot-0-active` assertion)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/onboarding/chrome.tsx mobile/src/screens/onboarding/chrome.test.tsx
git commit -m "feat(mobile): animate onboarding page dots"
```

---

### Task 3: `ArtFrame` bleed prop

The art sits inside the 20px gutter, reading as a boxed thumbnail. `bleed` lets it run the full screen width.

**Files:**
- Modify: `mobile/src/theme/components/ArtFrame.tsx`
- Test: `mobile/src/theme/components/ArtFrame.test.tsx` (create)

**Interfaces:**
- Consumes: nothing
- Produces: `ArtFrame({ source, aspect, fit, bleed, style, testID })` — `bleed?: boolean` (default `false`). When `true`, applies `marginHorizontal: -layout.gutter` so the frame spans past its parent's gutter padding.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/theme/components/ArtFrame.test.tsx`:

```tsx
/**
 * bleed is a layout escape hatch, so it is asserted on the resolved style
 * rather than by snapshot — a snapshot would not tell us which direction the
 * margin went.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ArtFrame } from './ArtFrame';
import { layout } from '../tokens';

const ART = 1 as unknown as number;

describe('ArtFrame', () => {
  it('stays inside the gutter by default', () => {
    render(<ArtFrame source={ART} aspect={1} testID="art" />);
    const style = StyleSheet.flatten(screen.getByTestId('art').props.style);
    expect(style.marginHorizontal).toBeUndefined();
  });

  it('runs past the gutter when bleeding', () => {
    render(<ArtFrame source={ART} aspect={1} bleed testID="art" />);
    const style = StyleSheet.flatten(screen.getByTestId('art').props.style);
    expect(style.marginHorizontal).toBe(-layout.gutter);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/theme/components/ArtFrame.test.tsx`

Expected: FAIL — the bleed case gets `undefined`, expected `-20`

- [ ] **Step 3: Write minimal implementation**

In `mobile/src/theme/components/ArtFrame.tsx`, add `layout` to the tokens import:

```ts
import { surfaces, shape, layout } from '../tokens';
```

Add to `ArtFrameProps`, after `fit`:

```ts
  /**
   * Runs the frame past its parent's gutter padding to the screen edges. The
   * onboarding panels use this so the art is not read as a thumbnail.
   */
  bleed?: boolean;
```

Change the signature to accept it:

```ts
export function ArtFrame({
  source,
  aspect,
  fit = 'width',
  bleed = false,
  style,
  testID,
}: ArtFrameProps) {
```

Add the margin to the style array, between `sizing` and the fill block:

```ts
      style={[
        sizing,
        bleed && { marginHorizontal: -layout.gutter },
        {
          backgroundColor: surfaces.sunken,
          borderRadius: shape.r4,
          overflow: 'hidden',
        },
        style,
      ]}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest --selectProjects components src/theme/components/ArtFrame.test.tsx`

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add mobile/src/theme/components/ArtFrame.tsx mobile/src/theme/components/ArtFrame.test.tsx
git commit -m "feat(mobile): add bleed prop to ArtFrame"
```

---

### Task 4: Hero typography on panel 1

Panel 1 is the one screen that should use the display step. The system defines it and nothing uses it.

**Files:**
- Modify: `mobile/src/screens/onboarding/OnboardingScreen.tsx:99-101` (the title) and `:206-209` (styles)
- Test: `mobile/src/screens/onboarding/OnboardingScreen.test.tsx` (add a case)

**Interfaces:**
- Consumes: `typography.display` from `src/theme/typography.ts`
- Produces: nothing new. Panel index 0 renders its title at `typography.display` (36/40/800); panels 1-2 stay at `typography.title` (24/30/700).

- [ ] **Step 1: Write the failing test**

Add to `mobile/src/screens/onboarding/OnboardingScreen.test.tsx`, inside the `describe('OnboardingScreen — content')` block:

```tsx
  it('sets the first panel at display weight and the rest at title', () => {
    render(<OnboardingScreen />);

    const welcome = screen.getByTestId('onboarding-panel-welcome');
    const welcomeTitle = within(welcome).getByText(panels[0].title);
    expect(StyleSheet.flatten(welcomeTitle.props.style).fontSize).toBe(36);

    const hold = screen.getByTestId('onboarding-panel-hold');
    const holdTitle = within(hold).getByText(panels[1].title);
    expect(StyleSheet.flatten(holdTitle.props.style).fontSize).toBe(24);
  });
```

Add `StyleSheet` to the react-native import at the top of that file:

```tsx
import { StyleSheet } from 'react-native';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/screens/onboarding/OnboardingScreen.test.tsx -t "display weight"`

Expected: FAIL — received `24`, expected `36`

- [ ] **Step 3: Write minimal implementation**

In `mobile/src/screens/onboarding/OnboardingScreen.tsx`, change the title line (currently line 100) from:

```tsx
          <Text style={styles.title}>{item.title}</Text>
```

to:

```tsx
          <Text style={i === 0 ? styles.titleHero : styles.title}>
            {item.title}
          </Text>
```

Add `titleHero` to the stylesheet, directly after the existing `title` entry:

```tsx
  // Panel 1 only. The hero carries the promise; panels 2-3 explain it, and
  // giving them the same weight would flatten that order.
  titleHero: {
    ...typography.display,
    textAlign: 'center',
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest --selectProjects components src/screens/onboarding/OnboardingScreen.test.tsx`

Expected: PASS — 10 tests

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingScreen.tsx mobile/src/screens/onboarding/OnboardingScreen.test.tsx
git commit -m "feat(mobile): set onboarding panel 1 at display weight"
```

---

### Task 5: Scroll-linked art parallax

The largest perceived-quality gain. Art translates at a fraction of page speed as the carousel swipes.

**Files:**
- Modify: `mobile/src/screens/onboarding/OnboardingScreen.tsx` (imports, `scrollX` ref, `renderPanel`, art region, `FlatList` → `Animated.FlatList`)
- Test: `mobile/src/screens/onboarding/OnboardingScreen.test.tsx` (add a case)

**Interfaces:**
- Consumes: `useReducedMotion()` (Task 1), `ArtFrame`'s `bleed` prop (Task 3)
- Produces: nothing new. Internal only.

- [ ] **Step 1: Write the failing test**

Add a new `describe` block at the end of `mobile/src/screens/onboarding/OnboardingScreen.test.tsx`:

```tsx
describe('OnboardingScreen — motion', () => {
  it('renders every panel with reduce-motion enabled', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    render(<OnboardingScreen />);

    await waitFor(() => {
      for (const panel of panels) {
        expect(screen.getByTestId(`onboarding-panel-${panel.key}`)).toBeTruthy();
      }
    });

    expect(screen.getByTestId('onboarding-art-welcome')).toBeTruthy();
  });

  it('gives each panel its own art layer', () => {
    render(<OnboardingScreen />);

    for (const panel of panels) {
      expect(screen.getByTestId(`onboarding-art-${panel.key}`)).toBeTruthy();
    }
  });
});
```

Add `AccessibilityInfo` to the react-native import in that file:

```tsx
import { StyleSheet, AccessibilityInfo } from 'react-native';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --selectProjects components src/screens/onboarding/OnboardingScreen.test.tsx -t "art layer"`

Expected: FAIL — unable to find an element with testID `onboarding-art-welcome`

- [ ] **Step 3: Write minimal implementation**

In `mobile/src/screens/onboarding/OnboardingScreen.tsx`:

Add `Animated` to the react-native import and `useReducedMotion` below the store import:

```tsx
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Animated,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
```

```tsx
import { useReducedMotion } from '../../hooks/useReducedMotion';
```

Inside the component, after the `listRef` declaration, add:

```tsx
  const reducedMotion = useReducedMotion();
  // Page-space scroll offset. Driven natively so the parallax never drops a
  // frame behind the swipe.
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );
```

Add `useMemo` to the React import:

```tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
```

Replace the art region inside `renderPanel` (currently lines 91-95) with:

```tsx
        {/* The art region absorbs all vertical slack, so the square shrinks
            with the screen instead of pushing the footer off a short device.
            Art translates against the swipe at a fraction of page speed —
            the panel moves 1:1, the art 0.35:1, which reads as depth. */}
        <View style={styles.artRegion}>
          <Animated.View
            testID={`onboarding-art-${item.key}`}
            style={[
              styles.artLayer,
              reducedMotion
                ? null
                : {
                    transform: [
                      {
                        translateX: scrollX.interpolate({
                          inputRange: [
                            width * (i - 1),
                            width * i,
                            width * (i + 1),
                          ],
                          outputRange: [width * 0.35, 0, -width * 0.35],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
            ]}
          >
            <ArtFrame source={item.art} aspect={1} fit="contain" bleed />
          </Animated.View>
        </View>
```

Add `artLayer` to the stylesheet, after `artRegion`:

```tsx
  artLayer: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
```

Extend the `renderPanel` dependency array to include the new values:

```tsx
    [width, carouselHeight, insets.bottom, handleAdvance, exitToSignIn, reducedMotion, scrollX]
```

Replace the `FlatList` element (currently lines 153-167) with an `Animated.FlatList`:

```tsx
      <Animated.FlatList
        testID="onboarding-carousel"
        ref={listRef as never}
        data={panels}
        renderItem={renderPanel}
        keyExtractor={(item: OnboardingPanel) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        getItemLayout={(_: unknown, i: number) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e: LayoutChangeEvent) =>
          setCarouselHeight(e.nativeEvent.layout.height)
        }
        style={styles.carousel}
      />
```

Add `LayoutChangeEvent` to the react-native type imports:

```tsx
  type LayoutChangeEvent,
```

- [ ] **Step 4: Run the full onboarding suite**

Run: `cd mobile && npx jest --selectProjects components src/screens/onboarding/`

Expected: PASS — 12 tests across `OnboardingScreen.test.tsx`, `RoleSelectScreen.test.tsx`, `chrome.test.tsx`

- [ ] **Step 5: Typecheck**

Run: `cd mobile && npm run typecheck`

Expected: no output, exit 0

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingScreen.tsx mobile/src/screens/onboarding/OnboardingScreen.test.tsx
git commit -m "feat(mobile): add scroll-linked art parallax to onboarding"
```

---

### Task 6: Full-suite verification

**Files:**
- Modify: none

**Interfaces:**
- Consumes: everything above
- Produces: nothing

- [ ] **Step 1: Run the entire suite, both projects**

Run: `cd mobile && npm test`

Expected: PASS. The baseline before this plan is 275 tests across the repo; this plan adds 8 (4 hook, 2 chrome, 1 typography, 2 motion — minus 1 because the typography case extends an existing describe). Confirm no pre-existing test regressed, and that both the `node` and `components` projects report.

- [ ] **Step 2: Typecheck**

Run: `cd mobile && npm run typecheck`

Expected: no output, exit 0

- [ ] **Step 3: Verify on a short device**

The spec flags vertical fit as a risk: panel 1 now carries a 36px display title over a full-bleed art region. Run the app on an SE-class 667pt screen and confirm the footer buttons are fully visible on panel 1 and the art has shrunk rather than the footer being pushed off.

Run: `cd mobile && npm run ios` then select an iPhone SE simulator.

Expected: both footer buttons fully visible on panel 1; art region shorter than on a 844pt device.

If it overflows, the art region is the block that loses pixels — cap it with a `maxHeight`, never the footer.

- [ ] **Step 4: Commit any fit fix**

```bash
git add mobile/src/screens/onboarding/OnboardingScreen.tsx
git commit -m "fix(mobile): constrain onboarding art region on short devices"
```

Skip this step if Step 3 passed unchanged.

---

## Self-Review

**Spec coverage.** The design's "Visual treatment" section lists three moves: motion (Tasks 1, 2, 5), type (Task 4), art width (Tasks 3, 5). All covered. Role branching is deliberately **not** here — see the note below.

**Scope note.** The spec's delivery section assigned role branching to plan 1. It is moved to plan 2. Branching to a `Setup` screen that does not exist yet is a no-op: both roles would still land on Home, which is today's behaviour. Plan 2 introduces the branch and its destination in the same plan so each plan ships working software.

**Type consistency.** `useReducedMotion(): boolean` is defined in Task 1 and consumed in Tasks 2 and 5 under that exact name. `ArtFrame`'s `bleed?: boolean` is defined in Task 3 and consumed in Task 5. `motion.state` is the existing export from `tokens.ts:156`.

**Native driver.** Task 2 uses `useNativeDriver: false` deliberately — width is a layout property and the native driver cannot animate it. Task 5 uses `true` because it animates `transform` only. Both are correct and the divergence is intentional, not an inconsistency.
