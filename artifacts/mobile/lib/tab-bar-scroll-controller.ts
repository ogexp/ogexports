type Timer = ReturnType<typeof setTimeout>;

type ScrollControllerOptions = {
  onVisibilityChange: (visible: boolean) => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => Timer;
  cancel?: (timer: Timer) => void;
  idleMs?: number;
};

/** One pending idle timer, and React updates only on visibility transitions. */
export function createTabBarScrollController({
  onVisibilityChange,
  now = Date.now,
  schedule = setTimeout,
  cancel = clearTimeout,
  idleMs = 500,
}: ScrollControllerOptions) {
  let visible = true;
  let lastOffset = 0;
  let lastActivity = 0;
  let timer: Timer | null = null;
  let touchStart: { x: number; y: number } | null = null;

  const clearTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const update = (next: boolean) => {
    if (next === visible) return;
    visible = next;
    onVisibilityChange(next);
  };
  const checkIdle = () => {
    timer = null;
    const remaining = idleMs - (now() - lastActivity);
    if (remaining > 0) timer = schedule(checkIdle, remaining);
    else update(true);
  };
  const settle = () => {
    if (visible) return;
    lastActivity = now();
    if (timer === null) timer = schedule(checkIdle, idleMs);
  };
  const reveal = () => { clearTimer(); update(true); };
  const onOffset = (offset: number) => {
    if (!Number.isFinite(offset)) return;
    const next = Math.max(0, offset);
    const delta = next - lastOffset;
    lastOffset = next;
    if (Math.abs(delta) > 1) touchStart = null;
    if (delta > 3) update(false);
    else if (delta < -3) reveal();
    // Even slow momentum keeps the bar hidden until scrolling actually stops.
    settle();
  };
  const cancelTouch = () => { touchStart = null; };
  const beginTouch = (x: number, y: number) => { touchStart = { x, y }; };
  const endTouch = (x: number, y: number) => {
    const start = touchStart;
    touchStart = null;
    if (start && Math.hypot(x - start.x, y - start.y) <= 8) reveal();
  };
  return { reveal, onOffset, settle, beginTouch, endTouch, cancelTouch, dispose: () => { clearTimer(); cancelTouch(); } };
}
