import { useEffect } from "react"

/**
 * Global scroll-reveal system — GPU-friendly (opacity/transform only).
 * Observes <section> elements and reveals them as they enter the viewport.
 * Zero per-frame JS work: IntersectionObserver fires only at thresholds,
 * so it has no impact on scroll performance.
 */
export function useLuxeReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("luxe-in")
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    )

    const attach = () => {
      document.querySelectorAll<HTMLElement>("main section:not(.luxe-observed)").forEach(el => {
        // Skip elements already in the viewport on load — no pop-in on arrival
        const rect = el.getBoundingClientRect()
        el.classList.add("luxe-observed")
        if (rect.top < window.innerHeight * 0.9) { el.classList.add("luxe-in"); return }
        el.classList.add("luxe-reveal")
        io.observe(el)
      })
    }

    attach()
    // Watch for route changes / lazy-loaded content
    const mo = new MutationObserver(() => attach())
    mo.observe(document.body, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}
