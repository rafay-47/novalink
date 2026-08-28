"use client"

import { useState, useEffect, Fragment } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PhoneFormValues, phoneSchema, SaleFormValues, saleSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Zap, Plus, Search, DollarSign, Pencil, Trash2, MoreHorizontal, ShoppingCart, User, Handshake, Package, Receipt, Users, Calendar as CalendarIcon, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency, formatDateTime } from "@/lib/utils"
import { RevertSaleDialog } from "@/components/sales/revert-sale-dialog"
import type { Phone, Party } from "@/types/database"

interface AccessorySale {
  id: string
  invoice_number?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  sale_price?: number | null
  profit?: number | null
  payment_method?: string | null
  notes?: string | null
  created_at?: string
  phones?: { brand?: string; model?: string; item_type?: string | null } | null
}

const getSaleQuantity = (sale: AccessorySale): number => {
  const match = sale.notes?.match(/Qty:\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : 1
}

export default function AccessoriesPage() {
  const [items, setItems] = useState<Phone[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Adapter" | "Cable">("All")
  
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Phone | null>(null)
  
  // Direct Sale Modal
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Phone | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [saleType, setSaleType] = useState<"walkin" | "party" | null>(null)
  const [saleLoading, setSaleLoading] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sales, setSales] = useState<AccessorySale[]>([])
  const [groupByParty, setGroupByParty] = useState(false)

  // Add Item Form
  const addForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      item_type: "Adapter",
      brand: "",
      model: "",
      imei: "",
      color: "",
      condition: "New",
      purchase_price: undefined,
      sale_price: undefined,
      status: "In Stock",
      notes: "",
    },
  })

  // Edit Item Form
  const editForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
  })

  // Direct Sale Form
  const saleForm = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_price: 0,
      payment_method: "Cash",
      amount_paid: 0,
      date_option: "today",
      sale_date: "",
    },
  })

  useEffect(() => {
    fetchAccessories()
    fetchParties()
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const response = await fetch("/api/sales?category=accessories", { cache: "no-store" })
      const data = await response.json()
      setSales(data.sales || [])
    } catch (error) {
      console.error("Failed to fetch accessory sales:", error)
    }
  }

  const fetchAccessories = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/phones?item_type=accessories&limit=1000", { cache: "no-store" })
      const data = await response.json()
      const accessoriesOnly = (data.phones || []).filter(
        (p: Phone) => p.item_type?.toLowerCase() === "adapter" || p.item_type?.toLowerCase() === "cable"
      )
      setItems(accessoriesOnly)
    } catch (error) {
      console.error("Failed to fetch accessories:", error)
    } finally {
      setLoading(false)
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

  const handleAddSubmit = async (values: PhoneFormValues) => {
    try {
      // Auto-generate code if empty
      const payload = {
        ...values,
        imei: values.imei && values.imei.trim().length > 0 ? values.imei : `ACC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      }

      const response = await fetch("/api/phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        addForm.reset()
        setAddDialogOpen(false)
        fetchAccessories()
        fetchSales()
      }
    } catch (error) {
      console.error("Failed to add accessory:", error)
    }
  }

  const handleEditOpen = (item: Phone) => {
    setEditingItem(item)
    editForm.reset({
      item_type: (item.item_type as "Adapter" | "Cable") || "Adapter",
      brand: item.brand,
      model: item.model,
      imei: item.imei || "",
      color: item.color || "",
      condition: item.condition || "New",
      purchase_price: item.purchase_price || undefined,
      sale_price: item.sale_price || undefined,
      status: item.status || "In Stock",
      notes: item.notes || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (values: PhoneFormValues) => {
    if (!editingItem) return
    try {
      const response = await fetch(`/api/phones/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        setEditDialogOpen(false)
        setEditingItem(null)
        fetchAccessories()
        fetchSales()
      }
    } catch (error) {
      console.error("Failed to update accessory:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    try {
      const response = await fetch(`/api/phones/${id}`, { method: "DELETE" })
      if (response.ok) {
        fetchAccessories()
        fetchSales()
      }
    } catch (error) {
      console.error("Failed to delete accessory:", error)
    }
  }

  const handleOpenSale = (item: Phone) => {
    setSelectedItem(item)
    setQuantity(1)
    setSaleType(null)
    saleForm.reset({
      phone_id: item.id,
      sale_price: item.sale_price || 0,
      payment_method: "Cash",
      amount_paid: item.sale_price || 0,
      customer_name: "",
      customer_phone: "",
      party_id: "",
      date_option: "today",
      sale_date: "",
    })
    setSaleDialogOpen(true)
  }

  const handleSaleTypeChange = (type: "walkin" | "party") => {
    setSaleType(type)
    if (type === "walkin") {
      saleForm.setValue("party_id", "")
      saleForm.setValue("amount_paid", saleForm.getValues("sale_price") || 0)
    } else {
      saleForm.setValue("customer_name", "")
      saleForm.setValue("customer_phone", "")
      saleForm.setValue("amount_paid", 0)
    }
  }

  const handleSaleSubmit = async (values: SaleFormValues) => {
    setSaleLoading(true)
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          quantity,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setInvoiceData(data.sale)
        setSaleDialogOpen(false)
        setShowSuccess(true)
        fetchAccessories()
        fetchSales()
      }
    } catch (error) {
      console.error("Failed to complete direct sale:", error)
    } finally {
      setSaleLoading(false)
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      categoryFilter === "All" ||
      item.item_type?.toLowerCase() === categoryFilter.toLowerCase()
    const matchesSearch =
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase()) ||
      (item.imei && item.imei.toLowerCase().includes(search.toLowerCase())) ||
      (item.color && item.color.toLowerCase().includes(search.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const inStockItems = items.filter((i) => i.status === "In Stock")
  const totalStockValue = inStockItems.reduce((sum, i) => sum + (i.purchase_price || 0), 0)

  const partyGroups = Object.entries(
    sales.reduce<Record<string, AccessorySale[]>>((acc, sale) => {
      const key = sale.customer_name || "Walk-in"
      ;(acc[key] = acc[key] || []).push(sale)
      return acc
    }, {})
  ).sort((a, b) => {
    const sum = (rows: AccessorySale[]) => rows.reduce((t, r) => t + (r.sale_price || 0), 0)
    return sum(b[1]) - sum(a[1])
  })

  const renderSaleRow = (sale: AccessorySale) => (
    <TableRow key={sale.id}>
      <TableCell className="font-mono text-xs">{sale.invoice_number || "-"}</TableCell>
      <TableCell>
        <div className="font-medium">
          {sale.phones?.brand} {sale.phones?.model}
        </div>
        <div className="text-xs text-muted-foreground">
          {sale.phones?.item_type || "Accessory"}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="outline">x{getSaleQuantity(sale)}</Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">{sale.customer_name || "Walk-in"}</div>
        {sale.customer_phone && (
          <div className="text-xs text-muted-foreground">{sale.customer_phone}</div>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {sale.created_at ? formatDateTime(sale.created_at) : "-"}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(sale.sale_price || 0)}
      </TableCell>
      <TableCell className="text-right">
        {sale.profit != null && (
          <span className={sale.profit >= 0 ? "text-green-600" : "text-red-600"}>
            {formatCurrency(sale.profit)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <RevertSaleDialog
          sale={sale}
          onReverted={() => {
            setSales((prev) => prev.filter((s) => s.id !== sale.id))
            fetchSales()
          }}
        />
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Adapters & Cables
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage charger adapters and cables stock, edit items, and process direct sales (Walk-in or Party Credit Sale)
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Adapter / Cable
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accessories</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">Adapters & Cables catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Ready for direct sale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">Total purchase cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sales.length}</div>
            <p className="text-xs text-muted-foreground">Completed direct sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Inventory / Sales */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Main Table Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-0.5 bg-muted rounded-md text-xs">
              <button
                type="button"
                onClick={() => setCategoryFilter("All")}
                className={`px-3 py-1 font-medium rounded transition-all cursor-pointer ${
                  categoryFilter === "All" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("Adapter")}
                className={`px-3 py-1 font-medium rounded transition-all cursor-pointer ${
                  categoryFilter === "Adapter" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                Adapters ({items.filter((i) => i.item_type?.toLowerCase() === "adapter").length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("Cable")}
                className={`px-3 py-1 font-medium rounded transition-all cursor-pointer ${
                  categoryFilter === "Cable" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                Cables ({items.filter((i) => i.item_type?.toLowerCase() === "cable").length})
              </button>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accessories..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial / Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand & Title</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading adapters & cables...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No adapters or cables found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.imei || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={item.item_type?.toLowerCase() === "adapter" ? "default" : "secondary"}>
                          {item.item_type || "Adapter"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.brand} {item.model}</div>
                      </TableCell>
                      <TableCell className="text-sm">{item.color || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(item.purchase_price || 0)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(item.sale_price || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button size="sm" onClick={() => handleOpenSale(item)}>
                            <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                            Sell
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditOpen(item)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      </TabsContent>

      <TabsContent value="sales" className="space-y-4">
      {/* Sales Section */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Adapters & Cables Sales
            </CardTitle>
            <p className="text-sm text-muted-foreground">Completed direct sales for adapters and cables</p>
          </div>
          <Button
            size="sm"
            variant={groupByParty ? "default" : "outline"}
            onClick={() => setGroupByParty((v) => !v)}
          >
            <Users className="mr-2 h-4 w-4" />
            {groupByParty ? "Ungroup" : "Group by Party"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No adapters & cables sales yet
                    </TableCell>
                  </TableRow>
                ) : groupByParty ? (
                  partyGroups.map(([partyName, partySales]) => (
                    <Fragment key={partyName}>
                      <TableRow className="bg-muted">
                        <TableCell colSpan={8}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-medium flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {partyName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {partySales.length} sale{partySales.length === 1 ? "" : "s"} · Qty{" "}
                              {partySales.reduce((sum, s) => sum + getSaleQuantity(s), 0)} ·{" "}
                              {formatCurrency(
                                partySales.reduce((sum, s) => sum + (s.sale_price || 0), 0)
                              )}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {partySales.map(renderSaleRow)}
                    </Fragment>
                  ))
                ) : (
                  sales.map(renderSaleRow)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Adapter / Cable</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-3">
              <FormField
                control={addForm.control}
                name="item_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Adapter">Adapter / Charger</SelectItem>
                        <SelectItem value="Cable">Cable / Wire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={addForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Anker, Apple, Belkin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title / Model *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 20W Fast Charger, Type-C Cable" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={addForm.control}
                  name="imei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial / Barcode (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated if empty" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., White, Black" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={addForm.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="sale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Accessory</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Accessory</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-3">
              <FormField
                control={editForm.control}
                name="item_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Adapter">Adapter / Charger</SelectItem>
                        <SelectItem value="Cable">Cable / Wire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title / Model *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="imei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial / Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price</FormLabel>
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
                  control={editForm.control}
                  name="sale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price</FormLabel>
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
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Accessory</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Direct Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Direct Sale: {selectedItem?.brand} {selectedItem?.model}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md text-sm flex justify-between">
              <div>
                <span className="text-muted-foreground">Category: </span>
                <span className="font-medium">{selectedItem?.item_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cost: </span>
                <span className="font-medium">{formatCurrency(selectedItem?.purchase_price || 0)}</span>
              </div>
            </div>

            {!saleType ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary"
                  onClick={() => handleSaleTypeChange("walkin")}
                >
                  <User className="h-6 w-6" />
                  <span>Walk-in Customer</span>
                  <span className="text-xs text-muted-foreground">Immediate payment</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary"
                  onClick={() => handleSaleTypeChange("party")}
                >
                  <Handshake className="h-6 w-6" />
                  <span>Party / Dealer Sale</span>
                  <span className="text-xs text-muted-foreground">Cash or Credit balance</span>
                </Button>
              </div>
            ) : (
              <Form {...saleForm}>
                <form onSubmit={saleForm.handleSubmit(handleSaleSubmit)} className="space-y-3">
                  <div className="flex items-center justify-between text-sm pb-2 border-b">
                    <span className="font-medium">
                      Sale Type: {saleType === "walkin" ? "Walk-in Customer" : "Party / Dealer"}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSaleType(null)}>
                      Change
                    </Button>
                  </div>

                  {saleType === "walkin" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={saleForm.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Walk-in" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={saleForm.control}
                        name="customer_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <FormField
                      control={saleForm.control}
                      name="party_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Party *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select party" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parties.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.phone || "No phone"})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium leading-none">Quantity *</label>
                      <Input
                        type="number"
                        min={1}
                        className="mt-1.5"
                        value={quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value) || 1)
                          setQuantity(qty)
                          const unitPrice = selectedItem?.sale_price || 0
                          const total = unitPrice * qty
                          saleForm.setValue("sale_price", total)
                          if (saleType === "walkin") {
                            saleForm.setValue("amount_paid", total)
                          }
                        }}
                      />
                    </div>
                    <FormField
                      control={saleForm.control}
                      name="sale_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Price *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                field.onChange(val)
                                if (saleType === "walkin") {
                                  saleForm.setValue("amount_paid", val)
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={saleForm.control}
                      name="amount_paid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Paid *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={saleForm.control}
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

                  {/* Date Selection: Today vs Select Date */}
                  <div className="space-y-2 pt-2 border-t">
                    <FormLabel className="text-sm font-medium">Sale Date</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          saleForm.setValue("date_option", "today")
                          saleForm.setValue("sale_date", "")
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-medium transition-colors cursor-pointer",
                          (saleForm.watch("date_option") || "today") === "today"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-input bg-background hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          saleForm.setValue("date_option", "custom")
                          if (!saleForm.getValues("sale_date")) {
                            const yesterday = new Date()
                            yesterday.setDate(yesterday.getDate() - 1)
                            saleForm.setValue("sale_date", yesterday.toISOString().split("T")[0])
                          }
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-medium transition-colors cursor-pointer",
                          saleForm.watch("date_option") === "custom"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-input bg-background hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <Clock className="h-4 w-4" />
                        Select Date
                      </button>
                    </div>

                    {saleForm.watch("date_option") === "custom" && (
                      <FormField
                        control={saleForm.control}
                        name="sale_date"
                        render={({ field }) => (
                          <FormItem className="pt-1">
                            <FormLabel className="text-xs text-muted-foreground">Select Past Sale Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                max={new Date().toISOString().split("T")[0]}
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setSaleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saleLoading}>
                      {saleLoading ? "Processing..." : "Complete Sale"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <DollarSign className="h-5 w-5" />
              Direct Sale Completed!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Invoice #</span>
              <span className="font-mono font-medium">{invoiceData?.invoice_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Item</span>
              <span className="font-medium">{invoiceData?.phones?.brand} {invoiceData?.phones?.model}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category</span>
              <Badge variant="outline">{invoiceData?.phones?.item_type || "Accessory"}</Badge>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-base font-medium">Total Price</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(invoiceData?.sale_price || 0)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
