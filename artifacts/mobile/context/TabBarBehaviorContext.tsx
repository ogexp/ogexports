import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type TabBarBehavior = {
  visible: boolean;
  reveal: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollSettled: () => void;
};

const TabBarBehaviorContext = createContext<TabBarBehavior | null>(null);

export function TabBarBehaviorProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const lastOffset = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = null;
    setVisible(true);
  }, []);

  const onScrollSettled = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      revealTimer.current = null;
      setVisible(true);
    }, 500);
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = offset - lastOffset.current;
    lastOffset.current = offset;
    if (delta > 3) {
      setVisible(false);
      onScrollSettled();
    } else if (delta < -3) {
      reveal();
    }
  }, [onScrollSettled, reveal]);

  useEffect(() => () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);

  return (
    <TabBarBehaviorContext.Provider value={{ visible, reveal, onScroll, onScrollSettled }}>
      {children}
    </TabBarBehaviorContext.Provider>
  );
}

export function useTabBarBehavior(): TabBarBehavior {
  const context = useContext(TabBarBehaviorContext);
  return context ?? {
    visible: true,
    reveal: () => undefined,
    onScroll: () => undefined,
    onScrollSettled: () => undefined,
  };
}
