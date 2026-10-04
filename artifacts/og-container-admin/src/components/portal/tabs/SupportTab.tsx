import { useState } from "react"
import { useListSupportTickets, useCreateSupportTicket, useUpdateSupportTicketStatus, useGetMe, useListSupportTicketMessages, useCreateSupportTicketMessage } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { SupportTicketStatusBadge } from "../status-badges"
import { ChatThread } from "../ChatThread"
import { MessageSquare } from "lucide-react"

export function SupportTab() {
  const { data: tickets, isLoading, refetch } = useListSupportTickets()
  const { data: me } = useGetMe()
  const createTicket = useCreateSupportTicket()
  const updateStatus = useUpdateSupportTicketStatus()
  const { toast } = useToast()
  
  const [createOpen, setCreateOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  
  const [chatOpenId, setChatOpenId] = useState<number | null>(null)

  const handleCreate = () => {
    createTicket.mutate({ data: { subject, message } }, {
      onSuccess: () => {
        toast({ title: "Ticket created" })
        setCreateOpen(false)
        setSubject("")
        setMessage("")
        refetch()
      },
      onError: () => toast({ title: "Failed to create ticket", variant: "destructive" })
    })
  }

  const handleStatusUpdate = (id: number, status: any) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status updated" })
        refetch()
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" })
    })
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold">Support Center</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Open New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} className="min-h-[120px]" />
              </div>
              <Button onClick={handleCreate} className="w-full mt-2" disabled={!subject || !message}>Submit Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {tickets?.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground border-dashed">
          <p>No support tickets.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets?.map(ticket => (
            <Card key={ticket.id}>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading font-semibold text-lg">{ticket.subject}</h3>
                    <SupportTicketStatusBadge status={ticket.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">Ticket #{ticket.id} • Opened {new Date(ticket.createdAt).toLocaleDateString()}</div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Dialog open={chatOpenId === ticket.id} onOpenChange={(open) => setChatOpenId(open ? ticket.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="gap-2"><MessageSquare className="w-4 h-4" /> Thread</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader><DialogTitle>Ticket Thread</DialogTitle></DialogHeader>
                      <TicketChat ticketId={ticket.id} currentUserId={me?.id} />
                    </DialogContent>
                  </Dialog>
                  {ticket.status !== "closed" && ticket.status !== "resolved" && (
                    <Button variant="outline" onClick={() => handleStatusUpdate(ticket.id, "resolved")}>Mark Resolved</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function TicketChat({ ticketId, currentUserId }: { ticketId: number, currentUserId?: string }) {
  const { data: messages, isLoading, refetch } = useListSupportTicketMessages(ticketId)
  const sendMsg = useCreateSupportTicketMessage()

  if (isLoading) return <div className="p-8 text-center"><Skeleton className="h-48 w-full" /></div>

  return (
    <ChatThread 
      messages={messages || []} 
      currentUserId={currentUserId}
      isPending={sendMsg.isPending}
      onSendMessage={(message) => {
        sendMsg.mutate({ id: ticketId, data: { message } }, {
          onSuccess: () => refetch()
        })
      }}
    />
  )
}
