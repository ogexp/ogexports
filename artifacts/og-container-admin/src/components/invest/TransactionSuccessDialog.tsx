import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  TransactionSuccessContent,
  type TransactionSuccessTone,
} from "@/components/invest/TransactionSuccessContent"

type TransactionSuccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  tone: TransactionSuccessTone
  status?: string | null
  reference?: string | null
}

export function TransactionSuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  tone,
  status,
  reference,
}: TransactionSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-[24px] border border-border/80 bg-card p-0 shadow-[0_28px_90px_rgba(17,38,29,0.24)]">
        <div aria-hidden="true" className="h-[3px] bg-gradient-to-r from-primary/35 via-accent to-primary/35" />
        <div className="px-7 pb-7 pt-8 sm:px-8">
          <TransactionSuccessContent
            title={title}
            description={description}
            tone={tone}
            status={status}
            reference={reference}
          />
          <DialogFooter className="mt-6 sm:justify-center">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Continue
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
