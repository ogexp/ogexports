import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageOff, ExternalLink } from "lucide-react"

type ChatImagePreviewProps = {
  src: string
  alt?: string
  className?: string
  thumbnailClassName?: string
}

export function ChatImagePreview({
  src,
  alt = "attachment",
  className,
  thumbnailClassName = "max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity",
}: ChatImagePreviewProps) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="w-4 h-4 shrink-0" />
        <span>Image unavailable</span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-primary underline underline-offset-2"
        >
          Try opening
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block text-left ${className ?? ""}`}
      >
        <img
          src={src}
          alt={alt}
          className={thumbnailClassName}
          onError={() => setFailed(true)}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-base truncate pr-8">
              {alt}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex items-center justify-center min-h-0 bg-muted/30 rounded-lg p-2">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={() => setFailed(true)}
            />
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
          >
            Open in new tab
            <ExternalLink className="w-3 h-3" />
          </a>
        </DialogContent>
      </Dialog>
    </>
  )
}
