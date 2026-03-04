import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { md3, spacing, shape, elevation } from '../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/**
 * Skeleton loading placeholder — M3 shimmer.
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius: br = shape.small,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius: br, opacity },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for a prediction card — matches M3 card layout.
 */
export function PredictionCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={100} height={14} />
        <SkeletonLoader width={40} height={20} borderRadius={shape.small} />
      </View>
      <View style={styles.cardTeams}>
        <View style={{ flex: 1 }}>
          <SkeletonLoader width={120} height={18} />
          <SkeletonLoader width={60} height={28} style={{ marginTop: 6 }} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <SkeletonLoader width={40} height={14} />
          <SkeletonLoader width={50} height={22} style={{ marginTop: 4 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <SkeletonLoader width={120} height={18} />
          <SkeletonLoader width={60} height={28} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={4} borderRadius={2} style={{ marginBottom: spacing.md }} />
      <View style={styles.cardTags}>
        <SkeletonLoader width={80} height={24} borderRadius={shape.small} />
        <SkeletonLoader width={70} height={24} borderRadius={shape.small} />
        <SkeletonLoader width={60} height={24} borderRadius={shape.small} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: md3.surfaceContainerHighest,
  },
  card: {
    backgroundColor: md3.surfaceContainerHigh,
    borderRadius: shape.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cardTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTags: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
