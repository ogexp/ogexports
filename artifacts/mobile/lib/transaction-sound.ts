export type TransactionFeedback = 'success' | 'approved' | 'ack' | 'attention';

export function shouldPlayTransactionChime(
  visible: boolean,
  feedback: TransactionFeedback,
): boolean {
  return visible && feedback !== 'attention';
}
