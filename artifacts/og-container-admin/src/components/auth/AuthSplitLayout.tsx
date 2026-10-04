import { ReactNode, useState, useEffect } from "react"
import { Link } from "wouter"

interface AuthSplitLayoutProps {
  children: ReactNode
}

const VIDEOS = [
  "/videos/global-trade-hero.mp4",
  "/videos/investment-hero.mp4",
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
        style={{ background: "#060d10" }}>

        {/* Video backgrounds */}
        {VIDEOS.map((src, idx) => (
          <video
            key={src}
            src={src}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out"
            style={{ opacity: idx === activeVideo ? 0.45 : 0 }}
            autoPlay muted loop playsInline
          />
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(105deg, rgba(6,13,16,0.96) 0%, rgba(6,13,16,0.82) 45%, rgba(6,13,16,0.55) 75%, rgba(6,13,16,0.30) 100%)"
        }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-40" style={{
          background: "linear-gradient(to top, rgba(6,13,16,0.9), transparent)"
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">

          {/* Logo */}
          <Link href="/" className="inline-block">
            <img
              src={`${import.meta.env.BASE_URL}og-logo.png`}
              alt="OG Exports"
              className="h-16 w-auto drop-shadow-lg"
              style={{ filter: "brightness(1.5) drop-shadow(0 0 18px rgba(0,201,167,0.45))" }}
            />
          </Link>

          {/* Hero copy */}
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase"
              style={{ borderColor: "rgba(0,201,167,0.35)", background: "rgba(0,201,167,0.08)", color: "#00c9a7" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00c9a7" }} />
              Global Trade Network
            </div>

            <h1 className="text-5xl font-heading font-bold leading-[1.1]" style={{ color: "#F0F7F5" }}>
              From Pakistan<br />to{" "}
              <span style={{ color: "#C6A969" }}>The World.</span>
            </h1>

            <p className="text-lg leading-relaxed" style={{ color: "rgba(240,247,245,0.72)" }}>
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
                    background: i === activeVideo ? "#00c9a7" : "rgba(240,247,245,0.25)",
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
                <div className="text-3xl font-heading font-bold" style={{ color: "#F0F7F5" }}>{s.val}</div>
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
