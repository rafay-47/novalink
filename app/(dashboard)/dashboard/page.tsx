"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Handshake,
  Calendar as CalendarIcon,
  DollarSign,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  TimeframeRange,
  TIMEFRAME_PRESET_OPTIONS,
  getDateRangeBounds,
  formatDateForInput,
} from "@/lib/date-ranges"

interface DashboardData {
  phonesCount: number
  periodSalesCount: number
  totalPeriodSales: number
  phoneSales: number
  accessorySales: number
  phoneSalesCount: number
  accessorySalesCount: number
  totalPeriodProfit: number
  accessoryProfit: number
  netProfit: number
  periodPurchasesCount: number
  totalPeriodPurchases: number
  totalPeriodExpenses: number
  recentSales: any[]
  totalReceivable: number
  totalPayable: number
  partyCount: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [range, setRange] = useState<TimeframeRange>("today")
  const [specificDate, setSpecificDate] = useState(() => formatDateForInput(new Date()))
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return formatDateForInput(d)
  })
  const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()))
  const [isPending, startTransition] = useTransition()

  const currentBounds = getDateRangeBounds(range, {
    specificDate,
    startDate,
    endDate,
  })

  useEffect(() => {
    loadData()
  }, [range, specificDate, startDate, endDate])

  const loadData = async () => {
    startTransition(async () => {
      try {
        const supabase = createBrowserClient()
        const bounds = getDateRangeBounds(range, {
          specificDate,
          startDate,
          endDate,
        })

        // Build filtered queries
        let salesQuery = supabase
          .from("sales")
          .select("*, phones(brand, model, item_type)")
          .eq("status", "active")
          .order("created_at", { ascending: false })

        let purchasesQuery = supabase
          .from("purchases")
          .select("*")

        let expensesQuery = supabase
          .from("expenses")
          .select("*")

        if (bounds.from) {
          salesQuery = salesQuery.gte("created_at", bounds.from)
          purchasesQuery = purchasesQuery.gte("created_at", bounds.from)
          expensesQuery = expensesQuery.gte("created_at", bounds.from)
        }

        if (bounds.to) {
          salesQuery = salesQuery.lte("created_at", bounds.to)
          purchasesQuery = purchasesQuery.lte("created_at", bounds.to)
          expensesQuery = expensesQuery.lte("created_at", bounds.to)
        }

        const [phonesCount, sales, purchases, expenses, partiesRes] = await Promise.all([
          supabase
            .from("phones")
            .select("*", { count: "exact", head: true })
            .eq("status", "In Stock"),
          salesQuery,
          purchasesQuery,
          expensesQuery,
          fetch("/api/parties"),
        ])

        const partiesData = await partiesRes.json().catch(() => ({ parties: [] }))
        const partiesList = partiesData.parties || []
        const totalReceivable = partiesList
          .filter((p: any) => p.balance > 0)
          .reduce((sum: number, p: any) => sum + p.balance, 0)
        const totalPayable = partiesList
          .filter((p: any) => p.balance < 0)
          .reduce((sum: number, p: any) => sum + Math.abs(p.balance), 0)

        const periodSalesList = (sales.data || []) as Array<{
          sale_price?: number | null
          profit?: number | null
          phones?: { item_type?: string | null } | null
        }>
        const isAccessorySale = (s: { phones?: { item_type?: string | null } | null }) =>
          s.phones?.item_type === "Adapter" || s.phones?.item_type === "Cable"

        const accessorySales = periodSalesList
          .filter(isAccessorySale)
          .reduce((sum, s) => sum + (s.sale_price || 0), 0)
        const phoneSales = periodSalesList
          .filter((s) => !isAccessorySale(s))
          .reduce((sum, s) => sum + (s.sale_price || 0), 0)

        const accessorySalesCount = periodSalesList.filter(isAccessorySale).length
        const phoneSalesCount = periodSalesList.filter((s) => !isAccessorySale(s)).length

        const accessoryProfit = periodSalesList
          .filter(isAccessorySale)
          .reduce((sum, s) => sum + (s.profit || 0), 0)
        const phoneProfit = periodSalesList
          .filter((s) => !isAccessorySale(s))
          .reduce((sum, s) => sum + (s.profit || 0), 0)

        const totalPeriodSales = sales.data?.reduce((sum: number, s: any) => sum + (s.sale_price || 0), 0) || 0
        const totalPeriodPurchases = purchases.data?.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0) || 0
        const totalPeriodExpenses = expenses.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0
        const netProfit = phoneProfit + accessoryProfit - totalPeriodExpenses

        setData({
          phonesCount: phonesCount.count || 0,
          periodSalesCount: sales.data?.length || 0,
          totalPeriodSales,
          phoneSales,
          accessorySales,
          phoneSalesCount,
          accessorySalesCount,
          totalPeriodProfit: phoneProfit,
          accessoryProfit,
          netProfit,
          periodPurchasesCount: purchases.data?.length || 0,
          totalPeriodPurchases,
          totalPeriodExpenses,
          recentSales: (sales.data || []).slice(0, 10),
          totalReceivable,
          totalPayable,
          partyCount: partiesList.length,
        })
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      }
    })
  }

  if (!data && isPending) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 animate-pulse bg-muted rounded" />
                <div className="h-4 w-4 animate-pulse bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 animate-pulse bg-muted rounded mb-2" />
                <div className="h-3 w-32 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Title & Comprehensive Timeframe Filter Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome to NovaLink! Here&apos;s your shop overview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(val: TimeframeRange) => setRange(val)}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_PRESET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Specific Date Picker */}
            {range === "specific_date" && (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full sm:w-[160px] h-9 text-sm"
                  aria-label="Select specific date"
                />
              </div>
            )}

            {/* Custom Timeframe Date Range Pickers */}
            {range === "custom" && (
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground font-medium">From:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-[145px] h-9 text-sm"
                    aria-label="Start Date"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground font-medium">To:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full sm:w-[145px] h-9 text-sm"
                    aria-label="End Date"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Indicator Badge */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-2.5 bg-muted/40 font-normal">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Viewing stats for: <strong className="font-semibold text-foreground">{currentBounds.label}</strong>
              </span>
            </Badge>
            {isPending && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Updating...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Metric Cards - Row 1 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Live In Stock & Number of phones sold in period */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.phonesCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">phones available</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sold in period: <span className="font-medium text-foreground">{data?.phoneSalesCount ?? 0} phones</span>
            </p>
          </CardContent>
        </Card>

        {/* Period Sales Revenue with Phones & Accessories Breakdown and Units Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Revenue</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalPeriodSales ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              Phones: <span className="font-medium text-foreground">{formatCurrency(data?.phoneSales ?? 0)}</span> ({data?.phoneSalesCount ?? 0} sold)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adapters & Cables: <span className="font-medium text-foreground">{formatCurrency(data?.accessorySales ?? 0)}</span> ({data?.accessorySalesCount ?? 0} sold)
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit with Phones & Accessories Breakdown and Units Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency((data?.totalPeriodProfit ?? 0) + (data?.accessoryProfit ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Phones: <span className="font-medium text-foreground">{formatCurrency(data?.totalPeriodProfit ?? 0)}</span> ({data?.phoneSalesCount ?? 0} sold)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adapters & Cables: <span className="font-medium text-foreground">{formatCurrency(data?.accessoryProfit ?? 0)}</span> ({data?.accessorySalesCount ?? 0} sold)
            </p>
          </CardContent>
        </Card>

        {/* Net Profit (Gross Profit - Expenses) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (data?.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(data?.netProfit ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">after expenses for period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Metric Cards - Row 2 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Expenses in Period */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.totalPeriodExpenses ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">total expenses in period</p>
          </CardContent>
        </Card>

        {/* Purchases in Period */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalPeriodPurchases ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.periodPurchasesCount ?? 0} {data?.periodPurchasesCount === 1 ? "purchase" : "purchases"}
            </p>
          </CardContent>
        </Card>

        {/* Parties Receivable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivable</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.totalReceivable ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">parties owe you (live balance)</p>
          </CardContent>
        </Card>

        {/* Parties Payable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payable</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.totalPayable ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">you owe parties (live balance)</p>
          </CardContent>
        </Card>
      </div>

      {/* Parties Overview Pill Card */}
      <div className="grid gap-4 grid-cols-1">
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                <Handshake className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Parties & Ledger Directory</p>
                <p className="text-xs text-muted-foreground">
                  You currently have {data?.partyCount ?? 0} registered dealers, suppliers & customers.
                </p>
              </div>
            </div>
            <Link
              href="/parties"
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-background hover:bg-muted border px-3 py-1.5 rounded-md transition-colors shadow-sm"
            >
              View Parties Directory <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Period Sales Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sales Breakdown
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Showing {data?.recentSales.length ?? 0} of {data?.periodSalesCount ?? 0} sales for{" "}
              {currentBounds.shortLabel}
            </CardDescription>
          </div>
          <CardDescription>
            <Link
              href="/sales"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all sales
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item / Device</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.recentSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No sales found for {currentBounds.label}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(sale.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.phones ? `${sale.phones.brand} ${sale.phones.model}` : "N/A"}
                        {sale.phones?.item_type && sale.phones.item_type !== "Phone" && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({sale.phones.item_type})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                      <TableCell className="text-xs capitalize">{sale.payment_method || "Cash"}</TableCell>
                      <TableCell
                        className={`text-right text-xs font-medium ${
                          (sale.profit || 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(sale.profit || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.sale_price)}
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
  )
}
