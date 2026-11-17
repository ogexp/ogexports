export function canChooseDepositPaymentMethod(identityStatus: string, serverStatusConfirmed: boolean): boolean {
  return serverStatusConfirmed && identityStatus.trim().toLowerCase() === 'verified';
}
