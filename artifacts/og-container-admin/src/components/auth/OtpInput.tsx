import { useRef } from "react"
import { Input } from "@/components/ui/input"

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  onComplete?: (code: string) => void
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  onComplete,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = Array.from({ length }, (_, i) => value[i] || "")

  function emit(next: string[]) {
    const code = next.join("").slice(0, length)
    onChange(code)
    if (code.length === length) onComplete?.(code)
  }

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[idx] = digit
    emit(next)
    if (digit && idx < length - 1) inputRefs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowRight" && idx < length - 1) inputRefs.current[idx + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!text.length) return
    const next = Array.from({ length }, (_, i) => text[i] ?? "")
    emit(next)
    inputRefs.current[Math.min(text.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2">
      {digits.map((d, i) => (
        <Input
          key={i}
          ref={el => { inputRefs.current[i] = el }}
          maxLength={1}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          className="w-10 h-10 text-center font-bold text-lg p-0"
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  )
}
