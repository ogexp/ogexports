import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { filterOptionsByQuery, normalizeSearchText, type SearchableOption } from "@/lib/option-search"

export type SearchableSelectOption = SearchableOption

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  required?: boolean
  className?: string
  id?: string
  /** When omitted, search shows only if options.length > 5 */
  showSearch?: boolean
  /** Max rows rendered when search is empty (default 80) */
  emptyLimit?: number
  /** Max rows rendered while searching (default 100) */
  searchLimit?: number
}

const EMPTY_LIMIT_DEFAULT = 80
const SEARCH_LIMIT_DEFAULT = 100

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled = false,
  required = false,
  className,
  id,
  showSearch,
  emptyLimit = EMPTY_LIMIT_DEFAULT,
  searchLimit = SEARCH_LIMIT_DEFAULT,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const safeOptions = useMemo(
    () =>
      options.filter(
        (o) =>
          typeof o.value === "string" &&
          o.value.length > 0 &&
          typeof o.label === "string" &&
          o.label.length > 0,
      ),
    [options],
  )

  const selected = safeOptions.find((o) => o.value === value)
  const searchEnabled = showSearch ?? safeOptions.length > 5

  const { visible, truncated, totalMatched } = useMemo(() => {
    const searching = Boolean(normalizeSearchText(query))
    const matched = filterOptionsByQuery(safeOptions, query)
    const limit = searching ? searchLimit : emptyLimit

    return {
      visible: matched.slice(0, limit),
      truncated: matched.length > limit,
      totalMatched: matched.length,
    }
  }, [safeOptions, query, emptyLimit, searchLimit])

  function handleOpenChange(next: boolean) {
    if (disabled) return
    setOpen(next)
    if (!next) setQuery("")
  }

  function pick(nextValue: string) {
    onChange(nextValue)
    setQuery("")
    setOpen(false)
  }

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
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border bg-background transition-all text-left",
              "outline-none appearance-none [-webkit-tap-highlight-color:transparent]",
              open ? "border-accent ring-2 ring-accent/20" : "border-border focus:outline-none focus:border-accent",
              !selected && "text-muted-foreground",
              disabled && "opacity-60 cursor-not-allowed",
              className,
            )}
          >
            <span className="flex-1 truncate">{selected?.label ?? placeholder}</span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)] overflow-hidden"
          align="start"
          sideOffset={6}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {searchEnabled && (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto py-1" role="listbox">
            {visible.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              visible.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    "bg-transparent outline-none appearance-none [-webkit-tap-highlight-color:transparent]",
                    "hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground active:bg-muted",
                    value === opt.value && "bg-accent/15 text-foreground",
                  )}
                >
                  <Check
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 text-primary",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
          {truncated && (
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              Showing {visible.length} of {totalMatched}
              {!normalizeSearchText(query) ? " — type to search all results…" : " matches"}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}
