import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, NativeTouchEvent } from 'react-native';
import { createTabBarScrollController } from '@/lib/tab-bar-scroll-controller';

type TabBarBehavior = {
  visible: boolean;
  reveal: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollSettled: () => void;
};

type TabBarScrollBehavior = Omit<TabBarBehavior, 'visible'> & {
  onTouchStart: (event: NativeSyntheticEvent<NativeTouchEvent>) => void;
  onTouchEnd: (event: NativeSyntheticEvent<NativeTouchEvent>) => void;
  onTouchCancel: () => void;
  onScrollBeginDrag: () => void;
};
const idleScrollBehavior: TabBarScrollBehavior = {
  reveal: () => undefined,
  onScroll: () => undefined,
  onScrollSettled: () => undefined,
  onTouchStart: () => undefined,
  onTouchEnd: () => undefined,
  onTouchCancel: () => undefined,
  onScrollBeginDrag: () => undefined,
};
const TabBarVisibilityContext = createContext(true);
const TabBarScrollContext = createContext<TabBarScrollBehavior>(idleScrollBehavior);

export function TabBarBehaviorProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const controller = useMemo(() => createTabBarScrollController({ onVisibilityChange: setVisible }), []);
  const actions = useMemo<TabBarScrollBehavior>(() => ({
    reveal: controller.reveal,
    onScroll: event => controller.onOffset(event.nativeEvent.contentOffset.y),
    onScrollSettled: controller.settle,
    onTouchStart: event => controller.beginTouch(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onTouchEnd: event => controller.endTouch(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onTouchCancel: controller.cancelTouch,
    onScrollBeginDrag: controller.cancelTouch,
  }), [controller]);
  useEffect(() => () => controller.dispose(), [controller]);

  return (
    <TabBarScrollContext.Provider value={actions}>
      <TabBarVisibilityContext.Provider value={visible}>{children}</TabBarVisibilityContext.Provider>
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarBehavior(): TabBarBehavior {
  const visible = useContext(TabBarVisibilityContext);
  const actions = useTabBarScrollBehavior();
  return useMemo(() => ({ visible, ...actions }), [visible, actions]);
}

/** Screens need stable handlers, not a re-render when the tab bar animates. */
export function useTabBarScrollBehavior(): TabBarScrollBehavior {
  return useContext(TabBarScrollContext);
}
