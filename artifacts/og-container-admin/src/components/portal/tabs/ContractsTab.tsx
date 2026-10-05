import { useState } from "react"
import { useListContracts, useCreateContract, useUpdateContractStatus, useGetMe } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileUploadField } from "@/components/account/FileUploadField"
import { useToast } from "@/hooks/use-toast"
import { ContractStatusBadge } from "../status-badges"
import { KycGateButton } from "../KycGateButton"

export function ContractsTab() {
  const { data: contracts, isLoading, refetch } = useListContracts()
  const { data: me } = useGetMe()
  const isSupplier = me?.accountType === "supplier"
  const createContract = useCreateContract()
  const updateStatus = useUpdateContractStatus()
  const { toast } = useToast()
  
  const [createOpen, setCreateOpen] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [title, setTitle] = useState("")
  const [docPath, setDocPath] = useState<string | null>(null)

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>

  const handleCreate = () => {
    createContract.mutate({ data: { orderId: Number(orderId), title, documentObjectPath: docPath || undefined } }, {
      onSuccess: () => {
        toast({ title: "Contract created" })
        setCreateOpen(false)
        setOrderId("")
        setTitle("")
        setDocPath(null)
        refetch()
      },
      onError: (error) => toast({ title: "Failed to create contract", description: error.message, variant: "destructive" })
    })
  }

  const handleStatusUpdate = (id: number, status: any) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status updated" })
        refetch()
      },
      onError: (error) => toast({ title: "Update failed", description: error.message, variant: "destructive" })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold">Contracts</h2>
        {isSupplier && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <KycGateButton actionName="draft contracts" asChild>
              <DialogTrigger asChild>
                <Button>Draft Contract</Button>
              </DialogTrigger>
            </KycGateButton>
            <DialogContent>
              <DialogHeader><DialogTitle>Draft New Contract</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order ID</label>
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} type="number" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract Title</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <FileUploadField 
                  label="Contract Document (PDF)" 
                  value={docPath} 
                  onChange={(path) => setDocPath(`/api/storage${path}`)} 
                  accept="application/pdf" 
                />
                <Button onClick={handleCreate} className="w-full" disabled={!orderId || !title}>Save Draft</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {contracts?.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground border-dashed">
          <p>No contracts found.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts?.map(contract => (
            <Card key={contract.id}>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading font-semibold text-lg">{contract.title}</h3>
                    <ContractStatusBadge status={contract.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">Order #{contract.orderId}</div>
                  {contract.documentObjectPath && (
                    <a href={contract.documentObjectPath} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline inline-block mt-2">
                      View Document
                    </a>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  {isSupplier && contract.status === "draft" && (
                    <KycGateButton actionName="send contracts" onClick={() => handleStatusUpdate(contract.id, "sent")}>
                      Send to Buyer
                    </KycGateButton>
                  )}
                  {!isSupplier && contract.status === "sent" && (
                    <KycGateButton actionName="sign contracts" onClick={() => handleStatusUpdate(contract.id, "signed")}>
                      Sign Contract
                    </KycGateButton>
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
