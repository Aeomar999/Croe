'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { states } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

const SQUIGGLE_PATHS = [
  { d: 'M -50,50 C 200,-50 350,250 650,100', strokeWidth: 80, opacity: 0.15 },
  { d: 'M -100,0 C 150,150 400,-50 600,100', strokeWidth: 120, opacity: 0.25 },
  { d: 'M -100,150 C 100,350 300,50 600,200', strokeWidth: 100, opacity: 0.25 },
  { d: 'M -150,180 C 50,400 350,0 650,250', strokeWidth: 60, opacity: 0.15 },
  { d: 'M -50,250 C 200,-50 350,450 550,150', strokeWidth: 120, opacity: 0.2 },
  { d: 'M -100,300 C 150,0 400,500 600,200', strokeWidth: 80, opacity: 0.3 },
  { d: 'M -50,350 C 50,200 200,100 450,250', strokeWidth: 140, opacity: 0.35 },
];

const LAYER_CONFIGS = [
  { translateY: [-30, 30], rotate: [-4, 4], y: 'top', x: 'right' },
  { translateY: [-20, 20], rotate: [-3, 2], y: 'bottom', x: 'left' },
  { translateY: [-15, 15], rotate: [-2, 2], y: 'bottom', x: 'right' },
  { translateX: [-15, 15], translateY: [-15, 15], y: 'bottom', x: 'left' },
];

export function Squiggles({ className, isSplashScreen = false }: { className?: string; isSplashScreen?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const squigglePaths = useMemo(() => SQUIGGLE_PATHS, []);
  const layerConfigs = useMemo(() => LAYER_CONFIGS, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-0 pointer-events-none overflow-hidden',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-0 pointer-events-none overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      {isSplashScreen && (
        <SquiggleLayer
          paths={squigglePaths.slice(0, 2)}
          config={layerConfigs[0]}
          duration={15000}
          delay={0}
        />
      )}
      <SquiggleLayer
        paths={squigglePaths.slice(1, 3)}
        config={layerConfigs[1]}
        duration={18000}
        delay={2000}
      />
      <SquiggleLayer
        paths={squigglePaths.slice(3, 5)}
        config={layerConfigs[2]}
        duration={20000}
        delay={4000}
      />
      <SquiggleLayer
        paths={squigglePaths.slice(5)}
        config={layerConfigs[3]}
        duration={22000}
        delay={6000}
      />
    </div>
  );
}

function SquiggleLayer({ 
  paths, 
  config, 
  duration, 
  delay 
}: { 
  paths: typeof SQUIGGLE_PATHS; 
  config: typeof LAYER_CONFIGS[0];
  duration: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        translateY: config.translateY,
        translateX: config.translateX,
        rotate: config.rotate,
      }}
      transition={{
        duration: duration / 1000,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
        delay,
      }}
      className="absolute w-[150%] h-[400px]"
      style={{
        top: config.y === 'top' ? '-50px' : undefined,
        bottom: config.y === 'bottom' ? '-100px' : undefined,
        left: config.x === 'left' ? '-100px' : undefined,
        right: config.x === 'right' ? '-100px' : undefined,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 600 400" preserveAspectRatio="none">
        {paths.map((path, i) => (
          <motion.path
            key={i}
            d={path.d}
            fill="none"
            stroke={states.secure.fill}
            strokeWidth={path.strokeWidth}
            strokeLinecap="round"
            opacity={path.opacity}
            initial={false}
            animate={{ pathLength: [1, 0, 1] }}
            transition={{
              duration: duration / 1000,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: delay / 1000 + i * 0.5,
            }}
          />
        ))}
      </svg>
    </motion.div>
  );
}