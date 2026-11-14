export type AmbientMotionState = {
  reduceMotion: boolean;
  motionSettingsReady: boolean;
  appState: string | null;
  isFocused: boolean;
  isDocumentVisible: boolean;
};

/** Unknown accessibility or lifecycle state is static, never implicitly active. */
export function canAnimateAmbient(state: AmbientMotionState): boolean {
  return state.motionSettingsReady
    && !state.reduceMotion
    && state.appState === 'active'
    && state.isFocused
    && state.isDocumentVisible;
}

/** Decorative SVG paint stays viewport-sized even inside very long content. */
export function ambientFieldGeometry(viewportHeight: number) {
  const height = Number.isFinite(viewportHeight) ? Math.max(0, Math.min(viewportHeight, 1000)) : 0;
  return { height: height * 0.7, offset: -height * 0.25 };
}
