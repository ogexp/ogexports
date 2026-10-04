import { useState } from "react"
import { useSetAccountType } from "@workspace/api-client-react"
import { SetAccountTypeInputAccountType, SetAccountTypeInputEntityType } from "@workspace/api-zod"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { Building2, Landmark, ShoppingCart, User, Users } from "lucide-react"

const ACCOUNT_TYPES: { value: string; label: string; description: string; icon: typeof ShoppingCart }[] = [
  { value: SetAccountTypeInputAccountType.buyer, label: "Buyer", description: "Source agricultural products for import", icon: ShoppingCart },
  { value: SetAccountTypeInputAccountType.supplier, label: "Supplier", description: "List products and fulfil export orders", icon: Users },
  { value: SetAccountTypeInputAccountType.investor, label: "Investor", description: "Fund containerised trade shipments", icon: Landmark },
]

const ENTITY_TYPES: { value: string; label: string; description: string; icon: typeof User }[] = [
  { value: SetAccountTypeInputEntityType.individual, label: "Individual", description: "Verify with a government ID and proof of address", icon: User },
  { value: SetAccountTypeInputEntityType.company, label: "Company", description: "Verify with registration and compliance documents", icon: Building2 },
]

export function AccountTypeStep({ onDone }: { onDone: () => void }) {
  const { toast } = useToast()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const [accountType, setAccountType] = useState<string>("")
  const [entityType, setEntityType] = useState<string>("")
  const setType = useSetAccountType()
  const visibleAccountTypes = ACCOUNT_TYPES.filter(
    t => (supplierModuleEnabled || t.value !== SetAccountTypeInputAccountType.supplier)
      && (investmentModuleEnabled || t.value !== SetAccountTypeInputAccountType.investor),
  )

  const handleSubmit = () => {
    if (!accountType || !entityType) return
    if (accountType === SetAccountTypeInputAccountType.supplier && !supplierModuleEnabled) {
      toast({
        title: "Supplier module unavailable",
        description: "Supplier registration is currently disabled.",
        variant: "destructive",
      })
      return
    }
    if (accountType === SetAccountTypeInputAccountType.investor && !investmentModuleEnabled) {
      toast({
        title: "Investment module unavailable",
        description: "Investor registration is currently disabled.",
        variant: "destructive",
      })
      return
    }
    setType.mutate(
      { data: { accountType: accountType as any, entityType: entityType as any } },
      {
        onSuccess: () => onDone(),
        onError: () =>
          toast({ title: "Could not save account type", description: "Please try again.", variant: "destructive" }),
      },
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-heading font-bold">Set up your trade account</h1>
        <p className="text-muted-foreground">Tell us how you'll use OG Exports and how you're verifying your identity.</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">I am a</Label>
        <RadioGroup value={accountType} onValueChange={setAccountType} className={`grid gap-4 ${visibleAccountTypes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {visibleAccountTypes.map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              htmlFor={`account-type-${value}`}
              className={`flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-colors ${
                accountType === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
              data-testid={`option-account-type-${value}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-accent" />
                <RadioGroupItem value={value} id={`account-type-${value}`} />
              </div>
              <div className="font-semibold">{label}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-base">Verifying as</Label>
        <RadioGroup value={entityType} onValueChange={setEntityType} className="grid sm:grid-cols-2 gap-4">
          {ENTITY_TYPES.map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              htmlFor={`entity-type-${value}`}
              className={`flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-colors ${
                entityType === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
              data-testid={`option-entity-type-${value}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-accent" />
                <RadioGroupItem value={value} id={`entity-type-${value}`} />
              </div>
              <div className="font-semibold">{label}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </label>
          ))}
        </RadioGroup>
      </div>

      <Button
        size="lg"
        className="w-full h-12 text-base"
        disabled={!accountType || !entityType || setType.isPending}
        onClick={handleSubmit}
        data-testid="button-continue-account-type"
      >
        {setType.isPending ? "Saving..." : "Continue"}
      </Button>
    </div>
  )
}
