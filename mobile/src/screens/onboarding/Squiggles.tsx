import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { line, ink, states } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

interface SquigglesProps {
  isSplashScreen?: boolean;
}

export function Squiggles({ isSplashScreen = false }: SquigglesProps) {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Soft, breathing animations
  const tY1 = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const rot1 = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '4deg'] });
  
  const tY2 = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const rot2 = anim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '2deg'] });

  const tX3 = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });
  const tY3 = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });

  return (
    <Animated.View style={styles.container}>
      {isSplashScreen && (
        <Animated.View style={[styles.layer, styles.layerVeryTop, { transform: [{ translateX: tY1 }, { rotate: rot1 }] }]}>
          <Svg width={width * 1.5} height={300} viewBox="0 0 500 300">
            <Path 
              d="M -50,50 C 200,-50 350,250 650,100" 
              fill="none" 
              stroke={states.secure.fill} 
              strokeWidth={80} 
              strokeLinecap="round"
              opacity={0.15}
            />
            <Path 
              d="M -100,0 C 150,150 400,-50 600,100" 
              fill="none" 
              stroke={states.secure.fill} 
              strokeWidth={120} 
              strokeLinecap="round"
              opacity={0.25}
            />
          </Svg>
        </Animated.View>
      )}

      {/* Top ambient swoop */}
      <Animated.View style={[styles.layer, styles.layerTop, { transform: [{ translateY: tY1 }, { rotate: rot1 }] }]}>
        <Svg width={width * 1.5} height={400} viewBox="0 0 500 400">
          <Path 
            d="M -100,150 C 100,350 300,50 600,200" 
            fill="none" 
            stroke={states.secure.fill} 
            strokeWidth={100} 
            strokeLinecap="round"
            opacity={0.25}
          />
          <Path 
            d="M -150,180 C 50,400 350,0 650,250" 
            fill="none" 
            stroke={states.secure.deep} 
            strokeWidth={60} 
            strokeLinecap="round"
            opacity={0.15}
          />
        </Svg>
      </Animated.View>

      {/* Middle crossing paths */}
      <Animated.View style={[styles.layer, styles.layerMiddle, { transform: [{ translateY: tY2 }, { rotate: rot2 }] }]}>
        <Svg width={width * 1.5} height={500} viewBox="0 0 500 500">
          <Path 
            d="M -50,250 C 200,-50 350,450 550,150" 
            fill="none" 
            stroke={states.secure.fill} 
            strokeWidth={120} 
            strokeLinecap="round"
            opacity={0.2}
          />
          <Path 
            d="M -100,300 C 150,0 400,500 600,200" 
            fill="none" 
            stroke={states.secure.fill} 
            strokeWidth={80} 
            opacity={0.3}
          />
        </Svg>
      </Animated.View>

      {/* Bottom accent blob */}
      <Animated.View style={[styles.layer, styles.layerBottom, { transform: [{ translateX: tX3 }, { translateY: tY3 }] }]}>
        <Svg width={width * 1.2} height={300} viewBox="0 0 400 300">
          <Path 
            d="M -50,350 C 50,200 200,100 450,250" 
            fill="none" 
            stroke={states.secure.fill} 
            strokeWidth={140} 
            strokeLinecap="round"
            opacity={0.35}
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
    pointerEvents: 'none',
  },
  layer: {
    position: 'absolute',
  },
  layerVeryTop: {
    top: -50,
    right: -100,
  },
  layerTop: {
    bottom: -50,
    left: -100,
  },
  layerMiddle: {
    bottom: -100,
    right: -100,
  },
  layerBottom: {
    bottom: -150,
    left: -50,
  }
});

