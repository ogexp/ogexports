import { ReactNode, useState, useEffect } from "react"
import { Link } from "wouter"

interface AuthSplitLayoutProps {
  children: ReactNode
}

const VIDEOS = [
  `${import.meta.env.BASE_URL}videos/global-trade-hero.mp4`,
  `${import.meta.env.BASE_URL}videos/investment-hero.mp4`,
]

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  const [activeVideo, setActiveVideo] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveVideo(v => (v + 1) % VIDEOS.length)
    }, 9000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">

      {/* ── Left panel (60%) ── */}
      <div className="relative hidden md:flex flex-col justify-between w-[60%] overflow-hidden"
        style={{ background: "#1b3028" }}>

        {/* Video backgrounds */}
        {VIDEOS.map((src, idx) => (
          <video
            key={src}
            src={src}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out"
            style={{ opacity: idx === activeVideo ? 0.34 : 0 }}
            autoPlay muted loop playsInline
          />
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(105deg, rgba(19,39,31,0.94) 0%, rgba(19,39,31,0.80) 45%, rgba(19,39,31,0.54) 75%, rgba(19,39,31,0.28) 100%)"
        }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-40" style={{
          background: "linear-gradient(to top, rgba(19,39,31,0.82), transparent)"
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">

          {/* Logo */}
          <Link href="/" className="inline-block">
            <img
              src={`${import.meta.env.BASE_URL}og-logo.png`}
              alt="OG Exports"
              className="h-14 w-auto"
              style={{ filter: "brightness(1.22)" }}
            />
          </Link>

          {/* Hero copy */}
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-[0.12em] uppercase"
              style={{ borderColor: "rgba(175,196,180,0.26)", background: "rgba(175,196,180,0.08)", color: "#c5d4c8" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#a9c4ae" }} />
              Global Trade Network
            </div>

            <h1 className="text-4xl lg:text-[2.75rem] font-heading font-semibold leading-[1.12]" style={{ color: "#F0F4EF" }}>
              From Pakistan<br />to{" "}
              <span style={{ color: "#d4c39b" }}>The World.</span>
            </h1>

            <p className="text-base leading-relaxed" style={{ color: "rgba(240,247,245,0.74)" }}>
              Premium agricultural exports you can trust. Join thousands of buyers and investors on Pakistan's leading commodity trade platform.
            </p>

            {/* Video indicator dots */}
            <div className="flex gap-2 pt-1">
              {VIDEOS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveVideo(i)}
                  className="transition-all duration-500 rounded-full"
                  style={{
                    width: i === activeVideo ? "24px" : "6px",
                    height: "6px",
                    background: i === activeVideo ? "#b8c9ba" : "rgba(240,247,245,0.25)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-10 pt-8" style={{ borderTop: "1px solid rgba(240,247,245,0.1)" }}>
            {[
              { val: "40+", lab: "Countries Served" },
              { val: "30+", lab: "Products Exported" },
              { val: "5+", lab: "Years Experience" },
            ].map(s => (
              <div key={s.lab} className="space-y-1">
                <div className="text-2xl font-heading font-semibold" style={{ color: "#F0F4EF" }}>{s.val}</div>
                <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(240,247,245,0.45)" }}>{s.lab}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (40%) ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center">
            <Link href="/">
              <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG Exports" className="h-12 mx-auto" />
            </Link>
          </div>
          {children}
        </div>
      </div>

    </div>
  )
}
