import { useState } from "react"
import { useListRfqs, useAcceptRfq, useDeclineRfq, useCloseRfq, useQuoteRfq, useGetMe, useListRfqMessages, useCreateRfqMessage } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { RfqStatusBadge } from "../status-badges"
import { ChatThread } from "../ChatThread"
import { MessageSquare } from "lucide-react"
import { KycGateButton } from "../KycGateButton"

export function RfqsTab() {
  const { data: rfqs, isLoading, refetch } = useListRfqs()
  const { data: me } = useGetMe()
  const isSupplier = me?.accountType === "supplier"

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold">Requests for Quotation</h2>
      
      {rfqs?.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground border-dashed">
          <p>No RFQs found.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rfqs?.map(rfq => (
            <RfqCard key={rfq.id} rfq={rfq} isSupplier={isSupplier} onUpdate={refetch} currentUserId={me?.id} />
          ))}
        </div>
      )}
    </div>
  )
}

function RfqCard({ rfq, isSupplier, onUpdate, currentUserId }: { rfq: any, isSupplier: boolean, onUpdate: () => void, currentUserId?: string }) {
  const { toast } = useToast()
  const acceptRfq = useAcceptRfq()
  const declineRfq = useDeclineRfq()
  const closeRfq = useCloseRfq()
  const quoteRfq = useQuoteRfq()
  
  const [quotePrice, setQuotePrice] = useState("")
  const [quoteMessage, setQuoteMessage] = useState("")
  const [quoteOpen, setQuoteOpen] = useState(false)
  
  const [chatOpen, setChatOpen] = useState(false)

  const handleAction = (action: any, data?: any) => {
    action.mutate({ id: rfq.id, data }, {
      onSuccess: () => {
        toast({ title: "Updated successfully" })
        setQuoteOpen(false)
        onUpdate()
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" })
    })
  }

  return (
    <Card>
      <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-heading font-semibold text-lg">Product #{rfq.productId}</h3>
            <RfqStatusBadge status={rfq.status} />
          </div>
          <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
            <div>Quantity: <span className="font-medium text-foreground">{rfq.quantity}</span></div>
            {rfq.targetDeliveryTerm && <div>Delivery: <span className="font-medium text-foreground">{rfq.targetDeliveryTerm}</span></div>}
            <div className="col-span-2">Requested: {new Date(rfq.createdAt).toLocaleDateString()}</div>
          </div>
          {rfq.message && <p className="text-sm mt-2 p-3 bg-muted rounded-md">{rfq.message}</p>}
          
          {rfq.quotedPrice && (
            <div className="mt-4 p-4 border border-accent/20 bg-accent/5 rounded-lg space-y-2">
              <div className="font-semibold text-accent">Quote Received: {rfq.quotedPrice}</div>
              {rfq.quotedMessage && <p className="text-sm">{rfq.quotedMessage}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-[140px]">
          <Dialog open={chatOpen} onOpenChange={setChatOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="w-full gap-2"><MessageSquare className="w-4 h-4" /> Message</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>RFQ Discussion</DialogTitle></DialogHeader>
              <RfqChat rfqId={rfq.id} currentUserId={currentUserId} />
            </DialogContent>
          </Dialog>

          {isSupplier && rfq.status === "new" && (
            <>
              <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
                <KycGateButton actionName="provide quotes" asChild>
                  <DialogTrigger asChild>
                    <Button className="w-full">Provide Quote</Button>
                  </DialogTrigger>
                </KycGateButton>
                <DialogContent>
                  <DialogHeader><DialogTitle>Provide Quote</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price Quote</label>
                      <Input value={quotePrice} onChange={e => setQuotePrice(e.target.value)} placeholder="e.g. $50,000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Message</label>
                      <Textarea value={quoteMessage} onChange={e => setQuoteMessage(e.target.value)} placeholder="Terms, valid until..." />
                    </div>
                    <Button onClick={() => handleAction(quoteRfq, { quotedPrice: quotePrice, quotedMessage: quoteMessage })} className="w-full" disabled={!quotePrice}>
                      Send Quote
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <KycGateButton actionName="decline quotes" variant="outline" className="w-full text-destructive" onClick={() => handleAction(declineRfq)}>
                Decline
              </KycGateButton>
            </>
          )}

          {!isSupplier && rfq.status === "quoted" && (
            <>
              <KycGateButton actionName="accept quotes and create orders" className="w-full" onClick={() => handleAction(acceptRfq)}>
                Accept (Create Order)
              </KycGateButton>
              <KycGateButton actionName="decline quotes" variant="outline" className="w-full" onClick={() => handleAction(closeRfq)}>
                Decline Quote
              </KycGateButton>
            </>
          )}

          {!isSupplier && rfq.status === "new" && (
            <Button variant="outline" className="w-full" onClick={() => handleAction(closeRfq)}>Cancel Request</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RfqChat({ rfqId, currentUserId }: { rfqId: number, currentUserId?: string }) {
  const { data: messages, isLoading, refetch } = useListRfqMessages(rfqId)
  const sendMsg = useCreateRfqMessage()

  if (isLoading) return <div className="p-8 text-center"><Skeleton className="h-48 w-full" /></div>

  return (
    <ChatThread 
      messages={messages || []} 
      currentUserId={currentUserId}
      isPending={sendMsg.isPending}
      onSendMessage={(message) => {
        sendMsg.mutate({ id: rfqId, data: { message } }, {
          onSuccess: () => refetch()
        })
      }}
    />
  )
}
