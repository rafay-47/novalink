"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("month")
  const [salesCategoryFilter, setSalesCategoryFilter] = useState<"all" | "phones" | "accessories">("all")
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<any[]>([])
  const [expensesData, setExpensesData] = useState<any[]>([])
  const [phonesList, setPhonesList] = useState<any[]>([])
  const [partyBalances, setPartyBalances] = useState<any[]>([])

  useEffect(() => {
    fetchReports()
  }, [dateRange])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const [salesRes, expensesRes, phonesRes, partiesRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/expenses"),
        fetch("/api/phones"),
        fetch("/api/parties"),
      ])

      const salesData = await salesRes.json()
      const expensesData = await expensesRes.json()
      const phonesData = await phonesRes.json()
      const partiesData = await partiesRes.json()

      setSalesData(salesData.sales || [])
      setExpensesData(expensesData.expenses || [])
      setPhonesList(phonesData.phones || [])
      setPartyBalances(partiesData.parties || [])
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSalesData = salesData.filter((sale) => {
    const isAccessory = sale.phones?.item_type === "Adapter" || sale.phones?.item_type === "Cable"
    if (salesCategoryFilter === "phones") return !isAccessory
    if (salesCategoryFilter === "accessories") return isAccessory
    return true
  })

  const totalSales = salesData.reduce((sum, s) => sum + (s.sale_price || 0), 0)
  const accessoryProfit = salesData
    .filter((s) => s.phones?.item_type === "Adapter" || s.phones?.item_type === "Cable")
    .reduce((sum, s) => sum + (s.profit || 0), 0)
  const totalProfit = salesData
    .filter((s) => !(s.phones?.item_type === "Adapter" || s.phones?.item_type === "Cable"))
    .reduce((sum, s) => sum + (s.profit || 0), 0)
  const totalExpenses = expensesData.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalProfit - totalExpenses

  const phoneItems = phonesList.filter((p) => !p.item_type || p.item_type === "Phone")
  const accessoryItems = phonesList.filter((p) => p.item_type === "Adapter" || p.item_type === "Cable")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Business analytics and insights</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">{salesData.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">phones gross profit</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adapters & Cables: <span className="font-medium">{formatCurrency(accessoryProfit)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">{expensesData.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">after expenses</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Breakdown</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="parties">Party Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Sales Transactions</CardTitle>
              <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit text-xs">
                <button
                  type="button"
                  onClick={() => setSalesCategoryFilter("all")}
                  className={`px-3 py-1 font-medium rounded transition-all cursor-pointer ${
                    salesCategoryFilter === "all" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  All Items ({salesData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSalesCategoryFilter("phones")}
                  className={`px-3 py-1 font-medium rounded transition-all cursor-pointer ${
                    salesCategoryFilter === "phones" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  Phones ({salesData.filter(s => !s.phones?.item_type || s.phones?.item_type === "Phone").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSalesCategoryFilter("accessories")}
                  className={`px-3 py-1 font-medium rounded transition-all cursor-pointer ${
                    salesCategoryFilter === "accessories" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  Adapters & Cables ({salesData.filter(s => s.phones?.item_type === "Adapter" || s.phones?.item_type === "Cable").length})
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item / Device</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredSalesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No sales data available for this category filter
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSalesData.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-sm">{formatDate(sale.created_at)}</TableCell>
                          <TableCell className="font-medium">
                            {sale.phones ? `${sale.phones.brand} ${sale.phones.model}` : "N/A"}
                            {sale.phones?.item_type && sale.phones.item_type !== "Phone" && (
                              <span className="ml-2 text-xs text-muted-foreground">({sale.phones.item_type})</span>
                            )}
                          </TableCell>
                          <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(sale.sale_price)}</TableCell>
                          <TableCell className={sale.profit >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(sale.profit || 0)}
                          </TableCell>
                          <TableCell>{sale.payment_method}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Mobile Phones Inventory</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Mobile Phones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{phoneItems.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Phones In Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">{phoneItems.filter(p => p.status === "In Stock").length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Phones Sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600">{phoneItems.filter(p => p.status === "Sold").length}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Adapters & Cables Inventory</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Adapters & Cables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{accessoryItems.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Accessories In Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">{accessoryItems.filter(p => p.status === "In Stock").length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Accessories Sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600">{accessoryItems.filter(p => p.status === "Sold").length}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Rent", "Electricity", "Internet", "Salary", "Accessories", "Repairs", "Miscellaneous"].map(
                      (category) => {
                        const categoryExpenses = expensesData.filter((e) => e.category === category)
                        const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
                        return (
                          <TableRow key={category}>
                            <TableCell className="font-medium">{category}</TableCell>
                            <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                            <TableCell className="text-right">{categoryExpenses.length}</TableCell>
                          </TableRow>
                        )
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Party Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Receivable</TableHead>
                      <TableHead className="text-right">Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : partyBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No parties found</TableCell>
                      </TableRow>
                    ) : (
                      partyBalances.map((party) => (
                        <TableRow key={party.id}>
                          <TableCell className="font-medium">{party.name}</TableCell>
                          <TableCell>{party.contact_person || "-"}</TableCell>
                          <TableCell>{party.phone || "-"}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {party.balance > 0 ? formatCurrency(party.balance) : "-"}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {party.balance < 0 ? formatCurrency(Math.abs(party.balance)) : "-"}
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
      </Tabs>
    </div>
  )
}