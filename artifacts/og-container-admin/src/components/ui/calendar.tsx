"use client"

import * as React from "react"
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
  type DayPickerProps,
} from "react-day-picker"
import { cn } from "@/lib/utils"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: DayPickerProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background p-3 rounded-xl select-none",
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        month_caption: cn(
          "relative flex h-9 w-full items-center justify-center",
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          "text-sm font-semibold tracking-wide text-foreground",
          defaultClassNames.caption_label,
        ),
        nav: cn(
          "absolute inset-x-0 top-0 z-10 flex h-9 w-full items-center justify-between px-0.5",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
          defaultClassNames.button_next,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("grid grid-cols-7 mb-1", defaultClassNames.weekdays),
        weekday: cn(
          "flex size-9 items-center justify-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
          defaultClassNames.weekday,
        ),
        weeks: cn("flex flex-col gap-0.5", defaultClassNames.weeks),
        week: cn("grid grid-cols-7", defaultClassNames.week),
        day: cn(
          "relative flex size-9 items-center justify-center p-0 text-center",
          defaultClassNames.day,
        ),
        day_button: cn(defaultClassNames.day_button),
        today: cn(defaultClassNames.today),
        outside: cn(defaultClassNames.outside),
        disabled: cn(defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        selected: cn(defaultClassNames.selected),
        range_start: cn(defaultClassNames.range_start),
        range_middle: cn(defaultClassNames.range_middle),
        range_end: cn(defaultClassNames.range_end),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(rootClassName)}
            {...rootProps}
          />
        ),
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4", chevronClassName)}
                {...chevronProps}
              />
            )
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", chevronClassName)}
                {...chevronProps}
              />
            )
          }
          return (
            <ChevronDownIcon
              className={cn("size-4", chevronClassName)}
              {...chevronProps}
            />
          )
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected={isSelected || undefined}
      data-today={modifiers.today || undefined}
      data-outside={modifiers.outside || undefined}
      data-disabled={modifiers.disabled || undefined}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]/40 focus-visible:ring-offset-1",
        "hover:bg-[#0F3D2E]/10 hover:text-[#0F3D2E]",
        // Selected — brand emerald
        isSelected &&
          "bg-[#0F3D2E] text-[#F7F7F2] hover:bg-[#0F3D2E] hover:text-[#F7F7F2] shadow-sm",
        // Today (not selected) — soft gold ring
        modifiers.today &&
          !isSelected &&
          "ring-1 ring-[#C6A969]/70 text-[#0F3D2E] font-semibold bg-[#C6A969]/10",
        // Outside month
        modifiers.outside &&
          !isSelected &&
          "text-muted-foreground/45 hover:text-muted-foreground",
        // Disabled
        modifiers.disabled &&
          "opacity-35 pointer-events-none hover:bg-transparent hover:text-inherit",
        // Range (kept for compatibility)
        modifiers.range_start && "bg-[#0F3D2E] text-[#F7F7F2] rounded-full",
        modifiers.range_end && "bg-[#0F3D2E] text-[#F7F7F2] rounded-full",
        modifiers.range_middle && "bg-[#0F3D2E]/10 text-[#0F3D2E] rounded-none",
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
