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
