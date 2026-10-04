import { useMemo, useState } from "react"
import { format, parseISO, startOfTomorrow, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  /** ISO date string YYYY-MM-DD — dates on or before this are disabled. Default: today (so only future dates). */
  minDate?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function DatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Select date",
  required = false,
  disabled = false,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const min = useMemo(() => {
    if (minDate) {
      const parsed = parseISO(minDate)
      return isValid(parsed) ? parsed : startOfTomorrow()
    }
    // Strictly after today → earliest selectable is tomorrow
    return startOfTomorrow()
  }, [minDate])

  const selected = useMemo(() => {
    if (!value) return undefined
    const d = parseISO(value)
    return isValid(d) ? d : undefined
  }, [value])

  return (
    <>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="sr-only absolute opacity-0 pointer-events-none h-0 w-0"
        />
      )}
      <Popover open={open} onOpenChange={(next) => { if (!disabled) setOpen(next) }}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 h-10 rounded-lg text-sm border bg-background transition-all text-left",
              open ? "border-accent ring-2 ring-accent/20" : "border-border focus:outline-none focus:border-accent",
              !selected && "text-muted-foreground",
              disabled && "opacity-60 cursor-not-allowed",
              className,
            )}
          >
            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate">
              {selected ? format(selected, "MMM d, yyyy") : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          align="start"
          sideOffset={8}
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? min}
            onSelect={(day) => {
              if (!day) return
              onChange(toLocalISODate(day))
              setOpen(false)
            }}
            disabled={{ before: min }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
