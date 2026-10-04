import { useState } from "react"
import { useListMyListings, useCreateListing, useUpdateListing, useListProductCategories } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUploadField } from "@/components/account/FileUploadField"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { PackagePlus } from "lucide-react"
import { KycGateButton } from "../KycGateButton"

const listingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  shortDescription: z.string().min(1, "Short description is required"),
  description: z.string().min(1, "Description is required"),
  origin: z.string().min(1, "Origin is required"),
  imageUrl: z.string().min(1, "Image is required"),
  packaging: z.string().min(1, "Packaging is required"),
  hsCode: z.string().min(1, "HS Code is required"),
  moq: z.string().min(1, "MOQ is required"),
  leadTime: z.string().min(1, "Lead time is required"),
  status: z.enum(["draft", "published", "archived"])
})

export function ListingsTab() {
  const { data: listings, isLoading, refetch } = useListMyListings()
  const { data: categories } = useListProductCategories()
  const createListing = useCreateListing()
  const [createOpen, setCreateOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      name: "",
      category: "",
      shortDescription: "",
      description: "",
      origin: "",
      imageUrl: "",
      packaging: "",
      hsCode: "",
      moq: "",
      leadTime: "",
      status: "draft" as "draft" | "published" | "archived"
    }
  })

  const onSubmit = (data: z.infer<typeof listingSchema>) => {
    createListing.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Listing created" })
        setCreateOpen(false)
        form.reset()
        refetch()
      },
      onError: () => toast({ title: "Failed to create listing", variant: "destructive" })
    })
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold">My Product Catalog</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <KycGateButton actionName="create listings" asChild>
            <DialogTrigger asChild>
              <Button className="gap-2"><PackagePlus className="w-4 h-4" /> Create Listing</Button>
            </DialogTrigger>
          </KycGateButton>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Listing</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories?.map(c => <SelectItem key={c.category} value={c.category}>{c.category}</SelectItem>)}
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="shortDescription" render={({ field }) => (
                  <FormItem><FormLabel>Short Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Detailed Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="origin" render={({ field }) => (
                    <FormItem><FormLabel>Origin Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="hsCode" render={({ field }) => (
                    <FormItem><FormLabel>HS Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="packaging" render={({ field }) => (
                    <FormItem><FormLabel>Packaging</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="moq" render={({ field }) => (
                    <FormItem><FormLabel>MOQ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="leadTime" render={({ field }) => (
                    <FormItem><FormLabel>Lead Time</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FileUploadField label="Main Product Image" value={field.value} onChange={(path) => field.onChange(`/api/storage${path}`)} accept="image/*" />
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createListing.isPending}>Save Listing</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {listings?.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground border-dashed">
          <PackagePlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>You haven't created any product listings yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings?.map(listing => (
            <Card key={listing.id} className="overflow-hidden">
              <div className="aspect-[4/3] relative">
                <img src={listing.imageUrl} alt={listing.name} className="object-cover w-full h-full" />
                <Badge className="absolute top-2 right-2 bg-black/50 text-white border-0">{listing.status}</Badge>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-medium text-accent uppercase tracking-wider">{listing.category}</div>
                <h3 className="font-heading font-semibold text-lg">{listing.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{listing.shortDescription}</p>
                <div className="text-xs text-muted-foreground pt-2">Origin: {listing.origin}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
