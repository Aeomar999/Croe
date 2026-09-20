import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { surfaces, ink, line, states } from '../theme/tokens';
import { typography } from '../theme/typography';
import { useAuth } from '../hooks/useAuth';
import { Squiggles } from '../screens/onboarding/Squiggles';

interface AnimatedSplashScreenProps {
  onComplete: () => void;
}

export function AnimatedSplashScreen({ onComplete }: AnimatedSplashScreenProps) {
  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const dotScale = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const statusTranslateY = useRef(new Animated.Value(10)).current;
  const barContainerOpacity = useRef(new Animated.Value(0)).current;
  const barTranslateY = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  // Staggered letters
  const letters = ['c', 'r', 'o', 'e'];
  const letterAnims = useRef(letters.map(() => new Animated.Value(40))).current; // translateY

  const [statusText, setStatusText] = useState('Handshake secured');
  const [isCompleted, setIsCompleted] = useState(false);

  const { isAuthenticated } = useAuth();

  const finishSplash = () => {
    if (!isCompleted) {
      setIsCompleted(true);
      onComplete();
    }
  };

  React.useEffect(() => {
    console.log('AnimatedSplashScreen mounted, isAuthenticated:', isAuthenticated);
    // 1. Reveal letters
    const letterAnimations = letters.map((_, i) =>
      Animated.timing(letterAnims[i]!, {
        toValue: 0,
        duration: 800,
        delay: i * 60,
        useNativeDriver: false,
      })
    );

    // 2. Pop dot
    const popDot = Animated.spring(dotScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: false,
    });

    // 3. Status and bar fade in
    const fadeStatus = Animated.parallel([
      Animated.timing(statusOpacity, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(statusTranslateY, { toValue: 0, duration: 800, useNativeDriver: false }),
      Animated.timing(barContainerOpacity, { toValue: 1, duration: 800, delay: 200, useNativeDriver: false }),
    ]);

    // 4. Loading bar progress
    const fillBar = Animated.timing(barWidth, {
      toValue: 100, // percentage
      duration: 2200,
      useNativeDriver: false,
    });

    // 5. Exit sequence
    const customEase = Easing.bezier(0.25, 0.1, 0.25, 1);
    
    // The content (logo/text) floats up and scales down slightly, separating from the background.
    // We use useNativeDriver: true here so the exit transition runs at 60fps on the GPU,
    // avoiding any JS thread drops that cause a "rapid shift" or invisible animation.
    const exitAnimations = [
      Animated.timing(containerOpacity, { toValue: 0, duration: 1000, easing: customEase, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: -60, duration: 1000, easing: customEase, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 0.9, duration: 1000, easing: customEase, useNativeDriver: true }),
      Animated.timing(barTranslateY, { toValue: 60, duration: 1000, easing: customEase, useNativeDriver: true }),
    ];
    
    if (isAuthenticated) {
      exitAnimations.push(
        Animated.timing(containerScale, { toValue: 0.92, duration: 1000, easing: customEase, useNativeDriver: true })
      );
    } else {
      // Very dramatic zoom-through into the onboarding screens
      exitAnimations.push(
        Animated.timing(containerScale, { toValue: 1.25, duration: 1000, easing: customEase, useNativeDriver: true })
      );
    }
    const exitSequence = Animated.parallel(exitAnimations);

    const sequence = Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.stagger(60, letterAnimations),
        Animated.sequence([Animated.delay(500), popDot]),
        Animated.sequence([Animated.delay(700), fadeStatus]),
      ]),
      fillBar,
      Animated.delay(400), // <--- Give the user a moment to register completion
      exitSequence,
    ]);

    sequence.start((result) => {
      console.log('AnimatedSplashScreen sequence finished', result);
      finishSplash();
    });

    // GUARANTEED fallback to unmount the splash screen after 8 seconds,
    // ensuring we can SEE it for 8 seconds even if the animation fails.
    const fallbackTimer = setTimeout(() => {
      console.log('AnimatedSplashScreen fallback unmount triggered');
      finishSplash();
    }, 8000);

    // Status text updates
    const timer1 = setTimeout(() => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 300, useNativeDriver: false }).start(() => {
        setStatusText('Syncing ledger');
        Animated.timing(statusOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      });
    }, 2000);

    const timer2 = setTimeout(() => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 300, useNativeDriver: false }).start(() => {
        setStatusText('Calm over confrontation');
        Animated.timing(statusOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      });
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          elevation: 9999,
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <Squiggles isSplashScreen={true} />
      
      <View style={styles.innerContainer}>
        <Animated.View 
          style={[
            styles.content, 
            { transform: [{ translateY: Animated.add(contentTranslateY, -20) }, { scale: contentScale }] }
          ]}
        >
          <View style={styles.wordmarkContainer}>
            {letters.map((char, i) => (
              <View key={i} style={styles.letterMask}>
                <Animated.Text
                  style={[
                    styles.wordmark,
                    { transform: [{ translateY: letterAnims[i]! }] },
                  ]}
                >
                  {char}
                </Animated.Text>
              </View>
            ))}
            <Animated.Text
              style={[
                styles.wordmark,
                styles.dot,
                { transform: [{ scale: dotScale }] },
              ]}
            >
              .
            </Animated.Text>
          </View>

          <Animated.Text
            style={[
              styles.status,
              { opacity: statusOpacity, transform: [{ translateY: statusTranslateY }] },
            ]}
          >
            {statusText}
          </Animated.Text>
        </Animated.View>

        <View style={styles.bottomArea}>
          <Animated.View style={[
            styles.barContainer, 
            { opacity: barContainerOpacity, transform: [{ translateY: barTranslateY }] }
          ]}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: barWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -20 }],
  },
  wordmarkContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letterMask: {
    overflow: 'hidden',
    height: 52,
    justifyContent: 'flex-end',
  },
  wordmark: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 42,
    fontWeight: '700',
    color: ink.primary,
    letterSpacing: -1,
  },
  dot: {
    color: states.secure.fill,
    marginLeft: 2,
  },
  status: {
    ...typography.caption,
    color: ink.secondary,
    marginTop: 16,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  barContainer: {
    width: 140,
    height: 4,
    backgroundColor: line.primary,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: states.secure.fill,
    borderRadius: 999,
  },
});
