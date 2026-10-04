export function getFundingMetrics(raised: number, target: number, pendingReserved = 0) {
  const safeRaised = Number(raised) || 0
  const safeTarget = Number(target) || 0
  const safePending = Math.max(0, Number(pendingReserved) || 0)
  const remaining = Math.max(0, safeTarget - safeRaised - safePending)
  const pct = safeTarget > 0 ? Math.min(100, (safeRaised / safeTarget) * 100) : 0
  const reservedPct = safeTarget > 0 ? Math.min(100 - pct, (safePending / safeTarget) * 100) : 0
  const isFull = remaining <= 0
  return {
    pct,
    reservedPct,
    remaining,
    raised: safeRaised,
    target: safeTarget,
    pendingReserved: safePending,
    isFull,
  }
}
