import { useTranslation } from 'react-i18next'
import { LANGUAGES, changeLanguage } from '@/i18n'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = LANGUAGES.find(l => l.code === i18n.language || i18n.language.startsWith(l.code + '-')) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5 h-9 text-foreground/70 hover:text-foreground hover:bg-foreground/8 border border-transparent hover:border-border/60 transition-all"
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="text-sm font-medium">{current.flag} {current.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => void changeLanguage(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              lang.code === current.code ? 'bg-primary/8 text-primary font-semibold' : ''
            }`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium">{lang.nativeLabel}</span>
              <span className="text-xs text-muted-foreground">{lang.label}</span>
            </div>
            {lang.code === current.code && (
              <span className="ml-auto text-primary text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
