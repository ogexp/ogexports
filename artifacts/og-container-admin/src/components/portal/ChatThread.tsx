import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, User as UserIcon, Building2 } from "lucide-react"

export function ChatThread({ 
  messages, 
  onSendMessage, 
  isPending, 
  currentUserId 
}: { 
  messages: any[], 
  onSendMessage: (msg: string) => void,
  isPending: boolean,
  currentUserId?: string
}) {
  const [text, setText] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSendMessage(text)
    setText("")
  }

  return (
    <div className="flex flex-col h-[400px] border border-border rounded-lg bg-card overflow-hidden">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No messages yet.</div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const isMe = msg.senderId === currentUserId || msg.authorId === currentUserId
              const isSystem = msg.authorId === 'system' || msg.senderId === 'system'
              
              return (
                <div key={i} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSystem ? 'bg-primary text-primary-foreground' : isMe ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {isSystem ? <Building2 className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-lg text-sm ${isSystem ? 'bg-primary/10 border border-primary/20' : isMe ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}>
                    {msg.message}
                    <div className={`text-[10px] mt-1 ${isMe ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
      <div className="p-3 bg-muted/30 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder="Type a message..." 
            className="flex-1 bg-background"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={!text.trim() || isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
