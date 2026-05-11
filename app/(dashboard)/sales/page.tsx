"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SaleFormValues, saleSchema } from "@/lib/validations"
import { createClient } from "@/lib/supabase/client"
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
import { Search, ShoppingCart, DollarSign, Receipt, Phone, Printer } from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import type { Phone } from "@/types/database"

interface SalePhone extends Phone {
  selection?: boolean
}

export default function SalesPage() {
  const [phones, setPhones] = useState<SalePhone[]>([])
  const [selectedPhone, setSelectedPhone] = useState<SalePhone | null>(null)
  const [loading, setLoading] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [recentSales, setRecentSales] = useState<any[]>([])

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      phone_id: "",
      customer_name: "",
      customer_phone: "",
      sale_price: 0,
      payment_method: "Cash",
      notes: "",
    },
  })

  useEffect(() => {
    fetchAvailablePhones()
    fetchRecentSales()
  }, [])

  const fetchAvailablePhones = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("phones")
      .select("*")
      .eq("status", "In Stock")
      .order("created_at", { ascending: false })
    setPhones(data || [])
  }

  const fetchRecentSales = async () => {
    const response = await fetch("/api/sales")
    const data = await response.json()
    setRecentSales((data.sales || []).slice(0, 10))
  }

  const handleSearch = async (search: string) => {
    if (!search) {
      fetchAvailablePhones()
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("phones")
      .select("*")
      .eq("status", "In Stock")
      .or(`imei.ilike.%${search}%,model.ilike.%${search}%,brand.ilike.%${search}%`)
      .order("created_at", { ascending: false })
    setPhones(data || [])
  }

  const handleSelectPhone = (phone: SalePhone) => {
    setSelectedPhone(phone)
    form.setValue("phone_id", phone.id)
    form.setValue("sale_price", phone.sale_price || 0)
  }

  const onSubmit = async (values: SaleFormValues) => {
    setSaleLoading(true)
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        const data = await response.json()
        setInvoiceData(data.sale)
        setShowSuccess(true)
        form.reset()
        setSelectedPhone(null)
        fetchAvailablePhones()
        fetchRecentSales()
      }
    } catch (error) {
      console.error("Failed to complete sale:", error)
    } finally {
      setSaleLoading(false)
    }
  }

  const profit = selectedPhone && form.watch("sale_price")
    ? form.watch("sale_price") - (selectedPhone.purchase_price || 0)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales / POS</h1>
          <p className="text-sm text-muted-foreground">NovaLink fast phone sales</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Phones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search by IMEI, model, or brand..."
                onChange={(e) => handleSearch(e.target.value)}
              />

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>PTA</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No phones available
                        </TableCell>
                      </TableRow>
                    ) : (
                      phones.map((phone) => (
                        <TableRow
                          key={phone.id}
                          className={selectedPhone?.id === phone.id ? "bg-muted" : ""}
                        >
                          <TableCell className="font-mono text-xs">{phone.imei}</TableCell>
                          <TableCell>
                            <div className="font-medium">{phone.brand} {phone.model}</div>
                            <div className="text-xs text-muted-foreground">{phone.color} | {phone.storage}</div>
                          </TableCell>
                          <TableCell>
                            {phone.pta_status && (
                              <Badge variant={phone.pta_status === "PTA" ? "default" : phone.pta_status === "JV" ? "secondary" : "destructive"}>
                                {phone.pta_status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(phone.sale_price || 0)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={selectedPhone?.id === phone.id ? "default" : "outline"}
                              onClick={() => handleSelectPhone(phone)}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selectedPhone && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Complete Sale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="p-4 rounded-md bg-muted space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Selected Phone</span>
                      </div>
                      <p className="font-medium">{selectedPhone.brand} {selectedPhone.model}</p>
                      <p className="text-xs text-muted-foreground font-mono">IMEI: {selectedPhone.imei}</p>
                      <div className="flex gap-2">
                        {selectedPhone.pta_status && (
                          <Badge variant={selectedPhone.pta_status === "PTA" ? "default" : "secondary"}>
                            {selectedPhone.pta_status}
                          </Badge>
                        )}
                        <Badge variant="outline">{selectedPhone.condition}</Badge>
                      </div>
                      <div className="pt-2 border-t mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Purchase Price:</span>
                          <span>{formatCurrency(selectedPhone.purchase_price || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sale Price:</span>
                          <span className="font-medium">{formatCurrency(form.watch("sale_price") || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="text-muted-foreground">Profit:</span>
                          <span className="font-medium">{formatCurrency(profit)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Customer name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customer_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="03XX-XXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="sale_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sale Price *</FormLabel>
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

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedPhone(null)
                          form.reset()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saleLoading}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        {saleLoading ? "Processing..." : "Complete Sale"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableBody>
                    {recentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                          No recent sales
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {sale.phones?.brand} {sale.phones?.model}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sale.customer_name || "Walk-in"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(sale.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{formatCurrency(sale.sale_price)}</div>
                            {sale.profit !== null && (
                              <div className="text-xs text-green-600">+{formatCurrency(sale.profit)}</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Sale Completed!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Invoice #</span>
                <span className="font-mono font-medium">{invoiceData?.invoice_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Device</span>
                <span className="font-medium">
                  {invoiceData?.phones?.brand} {invoiceData?.phones?.model}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span>{invoiceData?.customer_name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Contact</span>
                <span>{invoiceData?.customer_phone || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment</span>
                <span className="px-2 py-1 bg-secondary rounded text-xs">{invoiceData?.payment_method}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(invoiceData?.sale_price || 0)}</span>
              </div>
              {invoiceData?.profit !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Profit</span>
                  <span className="text-sm font-medium text-green-600">+{formatCurrency(invoiceData?.profit)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSuccess(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowSuccess(false)
            }}>
              <Printer className="mr-2 h-4 w-4" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}