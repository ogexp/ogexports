export type TransactionFeedback = 'success' | 'approved' | 'ack' | 'attention';

export function transactionAudioModeForPlatform(platform: string) {
  return {
    // iOS transaction feedback is intentionally audible with the silent switch on.
    // Android should respect silent/vibrate ringer modes; playback uses media volume.
    playsInSilentMode: platform === 'ios',
    interruptionMode: 'mixWithOthers' as const,
  };
}

export function shouldPlayTransactionChime(
  visible: boolean,
  feedback: TransactionFeedback,
): boolean {
  return visible && feedback !== 'attention';
}
