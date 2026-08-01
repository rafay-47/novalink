"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Handshake, CheckCircle2, RotateCcw, DollarSign, Search, Send, Smartphone, Zap } from "lucide-react"
import { cn, formatCurrency, formatDateTime } from "@/lib/utils"
import type { Phone, Party } from "@/types/database"

interface ConsignmentPhone extends Phone {
  party?: Party | null
}

const handoverSchema = z.object({
  phone_id: z.string().min(1, "Phone is required"),
  party_id: z.string().min(1, "Party is required"),
})

const convertSaleSchema = z.object({
  sale_price: z.number().min(1, "Sale price is required"),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]),
  amount_paid: z.number().min(0).optional(),
  notes: z.string().optional(),
})

type HandoverFormValues = z.infer<typeof handoverSchema>
type ConvertSaleFormValues = z.infer<typeof convertSaleSchema>

export default function ConsignmentsPage() {
  const [consignments, setConsignments] = useState<ConsignmentPhone[]>([])
  const [availablePhones, setAvailablePhones] = useState<Phone[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false)
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const [selectedConsignment, setSelectedConsignment] = useState<ConsignmentPhone | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryTab, setCategoryTab] = useState<"phones" | "accessories">("phones")

  const handoverForm = useForm<HandoverFormValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      phone_id: "",
      party_id: "",
    },
  })

  const sellForm = useForm<ConvertSaleFormValues>({
    resolver: zodResolver(convertSaleSchema),
    defaultValues: {
      sale_price: 0,
      payment_method: "Cash",
      amount_paid: 0,
      notes: "",
    },
  })

  useEffect(() => {
    fetchConsignments()
    fetchAvailablePhones()
    fetchParties()
  }, [])

  const fetchConsignments = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/consignments")
      const data = await response.json()
      setConsignments(data.consignments || [])
    } catch (error) {
      console.error("Failed to fetch consignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePhones = async () => {
    try {
      const response = await fetch("/api/phones?status=In%20Stock&limit=100")
      const data = await response.json()
      setAvailablePhones(data.phones || [])
    } catch (error) {
      console.error("Failed to fetch available phones:", error)
    }
  }

  const fetchParties = async () => {
    try {
      const response = await fetch("/api/parties")
      const data = await response.json()
      setParties(data.parties || [])
    } catch (error) {
      console.error("Failed to fetch parties:", error)
    }
  }

  const onHandoverSubmit = async (values: HandoverFormValues) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/consignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        handoverForm.reset()
        setHandoverDialogOpen(false)
        fetchConsignments()
        fetchAvailablePhones()
      }
    } catch (error) {
      console.error("Failed to hand over phone:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturnToStock = async (phoneId: string) => {
    if (!confirm("Are you sure you want to return this phone to active shop inventory?")) return
    try {
      const response = await fetch(`/api/consignments/${phoneId}/return`, {
        method: "POST",
      })

      if (response.ok) {
        fetchConsignments()
        fetchAvailablePhones()
      }
    } catch (error) {
      console.error("Failed to return phone to stock:", error)
    }
  }

  const openSellModal = (consignment: ConsignmentPhone) => {
    setSelectedConsignment(consignment)
    sellForm.reset({
      sale_price: consignment.sale_price || consignment.purchase_price || 0,
      payment_method: "Cash",
      amount_paid: 0,
      notes: "",
    })
    setSellDialogOpen(true)
  }

  const onConvertSaleSubmit = async (values: ConvertSaleFormValues) => {
    if (!selectedConsignment) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/consignments/${selectedConsignment.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        setSellDialogOpen(false)
        setSelectedConsignment(null)
        sellForm.reset()
        fetchConsignments()
      }
    } catch (error) {
      console.error("Failed to convert consignment to sale:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredConsignments = consignments.filter((c) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      c.brand.toLowerCase().includes(term) ||
      c.model.toLowerCase().includes(term) ||
      c.imei.toLowerCase().includes(term) ||
      c.party?.name?.toLowerCase().includes(term)
    )
  })

  const totalCostValue = consignments.reduce((sum, c) => sum + (c.purchase_price || 0), 0)
  const uniquePartiesCount = new Set(consignments.map((c) => c.reserved_party_id).filter(Boolean)).size

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Phones Out</h1>
          <p className="text-sm text-muted-foreground">
            Track phones taken out by dealers & parties without immediately marking them sold
          </p>
        </div>
        <Button onClick={() => setHandoverDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Hand Over Phone
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Items With Parties</span>
            </div>
            <p className="text-2xl font-bold mt-1">{consignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Inventory Cost Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalCostValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active Parties</span>
            </div>
            <p className="text-2xl font-bold mt-1">{uniquePartiesCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Phones Currently Out
            </CardTitle>
            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by device, IMEI or party..."
                  className="pl-8 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Taken</TableHead>
                  <TableHead>Party / Dealer</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading consignments...
                    </TableCell>
                  </TableRow>
                ) : filteredConsignments.filter(c => !c.item_type || c.item_type === "Phone").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No phones currently out
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsignments.filter(c => !c.item_type || c.item_type === "Phone").map((consignment) => (
                    <TableRow key={consignment.id}>
                      <TableCell className="text-sm">
                        {consignment.reserved_at ? formatDateTime(consignment.reserved_at) : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{consignment.party?.name || "Unknown Party"}</div>
                        {consignment.party?.phone && (
                          <div className="text-xs text-muted-foreground">{consignment.party.phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{consignment.imei}</TableCell>
                      <TableCell>
                        <div className="font-medium">{consignment.brand} {consignment.model}</div>
                        <div className="text-xs text-muted-foreground flex gap-1 items-center mt-0.5">
                          <span>{consignment.color || "-"}</span>
                          {consignment.storage && <span>• {consignment.storage}</span>}
                          {consignment.pta_status && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 ml-1">
                              {consignment.pta_status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(consignment.purchase_price || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Handshake className="h-3 w-3" />
                          With Party
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => openSellModal(consignment)}
                          >
                            <DollarSign className="mr-1 h-3.5 w-3.5" />
                            Mark as Sold
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnToStock(consignment.id)}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Return Stock
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hand Over Phone Dialog */}
      <Dialog open={handoverDialogOpen} onOpenChange={setHandoverDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Hand Over Phone to Party / Dealer</DialogTitle>
          </DialogHeader>
          <Form {...handoverForm}>
            <form onSubmit={handoverForm.handleSubmit(onHandoverSubmit)} className="space-y-4">
              <FormField
                control={handoverForm.control}
                name="phone_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Available Phone *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an available phone from stock" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePhones.map((phone) => (
                          <SelectItem key={phone.id} value={phone.id}>
                            {phone.brand} {phone.model} ({phone.imei}) - {formatCurrency(phone.purchase_price || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={handoverForm.control}
                name="party_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Party / Dealer *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose party receiving the device" />
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

              <DialogFooter className="flex-col gap-2 sm:flex-row pt-2">
                <Button type="button" variant="outline" onClick={() => setHandoverDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Record Handover"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Convert Consignment to Sale Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Mark Consignment Phone as Sold</DialogTitle>
          </DialogHeader>
          {selectedConsignment && (
            <div className="p-3 bg-muted rounded-md space-y-1 mb-2 text-sm">
              <div className="font-semibold">{selectedConsignment.brand} {selectedConsignment.model}</div>
              <div className="text-xs font-mono text-muted-foreground">IMEI: {selectedConsignment.imei}</div>
              <div className="text-xs text-muted-foreground">Party: <span className="font-medium text-foreground">{selectedConsignment.party?.name}</span></div>
              <div className="text-xs text-muted-foreground">Purchase Cost: <span className="font-medium text-foreground">{formatCurrency(selectedConsignment.purchase_price || 0)}</span></div>
            </div>
          )}
          <Form {...sellForm}>
            <form onSubmit={sellForm.handleSubmit(onConvertSaleSubmit)} className="space-y-4">
              <FormField
                control={sellForm.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Sale Price *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={sellForm.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid Upfront</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0 = full credit sale to party"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(sellForm.watch("sale_price") || 0) > 0 && (
                <div className="p-3 rounded-md bg-muted text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calculated Profit:</span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency((sellForm.watch("sale_price") || 0) - (selectedConsignment?.purchase_price || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Party Credit Balance:</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(
                        (sellForm.watch("sale_price") || 0) - (sellForm.watch("amount_paid") || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              <FormField
                control={sellForm.control}
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

              <FormField
                control={sellForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col gap-2 sm:flex-row pt-2">
                <Button type="button" variant="outline" onClick={() => setSellDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {actionLoading ? "Processing..." : "Complete Sale"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
