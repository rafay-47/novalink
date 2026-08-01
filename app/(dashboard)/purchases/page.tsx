"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PurchaseFormValues, purchaseSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Package, User, Handshake, Smartphone, Zap } from "lucide-react"
import { cn, formatCurrency, formatDateTime } from "@/lib/utils"
import type { Purchase } from "@/types/database"

export type PurchaseWithPhone = Purchase & {
  phones?: {
    item_type?: string | null
    brand: string
    model: string
    imei: string
  } | null
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseWithPhone[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [parties, setParties] = useState<any[]>([])
  const [purchaseSource, setPurchaseSource] = useState<"customer" | "party">("customer")
  const [categoryTab, setCategoryTab] = useState<"phones" | "accessories">("phones")
  

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      brand: "",
      model: "",
      imei: "",
      color: "",
      ram: "",
      storage: "",
      battery_health: "",
      condition: "New",
      pta_status: undefined,
      seller_name: "",
      seller_phone: "",
      seller_cnic: "",
      purchase_price: 0,
      payment_method: "Cash",
      party_id: "",
      amount_paid: 0,
      notes: "",
    },
  })

  useEffect(() => {
    fetchPurchases()
    fetchParties()
  }, [])

  const fetchPurchases = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/purchases")
      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchParties = async () => {
    const response = await fetch("/api/parties")
    const data = await response.json()
    setParties(data.parties || [])
  }

  const onSubmit = async (values: PurchaseFormValues) => {
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        form.reset()
        setDialogOpen(false)
        fetchPurchases()
      }
    } catch (error) {
      console.error("Failed to add purchase:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Track purchases from suppliers & individual sellers
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </div>

      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setCategoryTab("phones")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer",
            categoryTab === "phones"
              ? "bg-background shadow text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Smartphone className="h-4 w-4" />
          Mobile Phones
        </button>
        <button
          type="button"
          onClick={() => setCategoryTab("accessories")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer",
            categoryTab === "accessories"
              ? "bg-background shadow text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-4 w-4" />
          Adapters & Cables
        </button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Purchase History ({categoryTab === "phones" ? "Mobile Phones" : "Adapters & Cables"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>IMEI / Code</TableHead>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : purchases.filter(p => categoryTab === "phones" ? (!p.phones?.item_type || p.phones?.item_type === "Phone") : (p.phones?.item_type === "Adapter" || p.phones?.item_type === "Cable")).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No {categoryTab === "phones" ? "phone" : "adapter or cable"} purchases found
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.filter(p => categoryTab === "phones" ? (!p.phones?.item_type || p.phones?.item_type === "Phone") : (p.phones?.item_type === "Adapter" || p.phones?.item_type === "Cable")).map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="text-sm">{formatDateTime(purchase.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {purchase.phones?.imei || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {purchase.phones
                          ? `${purchase.phones.brand} ${purchase.phones.model}`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">{purchase.seller_name}</TableCell>
                      <TableCell className="text-sm">
                        <div>{purchase.seller_phone || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">
                          {purchase.seller_cnic || ""}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(purchase.purchase_price)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[100px] truncate">
                        {purchase.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Purchase</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="item_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "Phone"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Phone">Mobile Phone</SelectItem>
                        <SelectItem value="Adapter">Adapter / Charger</SelectItem>
                        <SelectItem value="Cable">Cable / Wire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-sm font-medium text-muted-foreground">Phone Details</div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Apple, Samsung" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., iPhone 15 Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="imei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMEI</FormLabel>
                      <FormControl>
                        <Input placeholder="15-digit IMEI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Black, White" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="ram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RAM</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 8GB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 256GB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="battery_health"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Battery Health</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 95%" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Used">Used</SelectItem>
                          <SelectItem value="Refurbished">Refurbished</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pta_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PTA Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select PTA status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PTA">PTA</SelectItem>
                          <SelectItem value="NON-PTA">NON-PTA</SelectItem>
                          <SelectItem value="JV">JV</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Purchase Source</div>
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseSource("customer")
                      form.setValue("party_id", "")
                      form.setValue("amount_paid", 0)
                    }}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      purchaseSource === "customer"
                        ? "bg-background shadow text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <User className="h-3.5 w-3.5" />
                    Individual Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseSource("party")
                      form.setValue("seller_name", "")
                      form.setValue("seller_phone", "")
                      form.setValue("seller_cnic", "")
                    }}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      purchaseSource === "party"
                        ? "bg-background shadow text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Handshake className="h-3.5 w-3.5" />
                    Party / Dealer
                  </button>
                </div>

                {purchaseSource === "customer" && (
                  <div className="space-y-3 pt-1">
                    <FormField
                      control={form.control}
                      name="seller_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seller Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Seller name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="seller_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="03XX-XXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="seller_cnic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNIC</FormLabel>
                            <FormControl>
                              <Input placeholder="XXXXX-XXXXXXX-X" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {purchaseSource === "party" && (
                  <div className="space-y-3 pt-1">
                    <FormField
                      control={form.control}
                      name="party_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Party / Supplier *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a party" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parties.map((party) => (
                                <SelectItem key={party.id} value={party.id}>
                                  {party.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount_paid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Paid Upfront</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0 = full credit purchase"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("party_id") && (form.watch("purchase_price") || 0) > 0 && (
                      <div className="p-3 rounded-md bg-muted text-sm flex justify-between items-center">
                        <span className="text-muted-foreground">Remaining Balance (Credit):</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(
                            (form.watch("purchase_price") || 0) - (form.watch("amount_paid") || 0)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <FormField
                    control={form.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                            <SelectItem value="JazzCash">JazzCash</SelectItem>
                            <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Save Purchase</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}