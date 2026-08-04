"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Package, ShoppingCart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Handshake, Receipt } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { createClient as createBrowserClient } from "@/lib/supabase/client"

interface DashboardData {
  phonesCount: number
  periodSalesCount: number
  totalPeriodSales: number
  totalPeriodProfit: number
  periodPurchasesCount: number
  totalPeriodPurchases: number
  totalPeriodExpenses: number
  recentSales: any[]
  totalReceivable: number
  totalPayable: number
  partyCount: number
}

function getRangeStart(range: string): string {
  const now = new Date()
  switch (range) {
    case "today":
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    case "week": {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      now.setDate(now.getDate() - diff)
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    }
    case "month":
      now.setDate(1)
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    case "year":
      now.setMonth(0, 1)
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    case "all":
    default:
      return "1970-01-01T00:00:00.000Z"
  }
}

const rangeLabels: Record<string, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [range, setRange] = useState("today")

  useEffect(() => {
    loadData(range)
  }, [range])

  const loadData = async (selectedRange: string) => {
    const supabase = createBrowserClient()
    const from = getRangeStart(selectedRange)
    const label = rangeLabels[selectedRange]

    const [phonesCount, sales, purchases, expenses, recentSales, partiesRes] = await Promise.all([
      supabase
        .from("phones")
        .select("*", { count: "exact", head: true })
        .eq("status", "In Stock"),
      supabase
        .from("sales")
        .select("*, phones(brand, model)")
        .eq("status", "active")
        .gte("created_at", from)
        .order("created_at", { ascending: false }),
      supabase
        .from("purchases")
        .select("*")
        .gte("created_at", from),
      supabase
        .from("expenses")
        .select("*")
        .gte("created_at", from),
      supabase
        .from("sales")
        .select("*, phones(brand, model)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10),
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

    setData({
      phonesCount: phonesCount.count || 0,
      periodSalesCount: sales.data?.length || 0,
      totalPeriodSales: sales.data?.reduce((sum: number, s: any) => sum + (s.sale_price || 0), 0) || 0,
      totalPeriodProfit: sales.data?.reduce((sum: number, s: any) => sum + (s.profit || 0), 0) || 0,
      periodPurchasesCount: purchases.data?.length || 0,
      totalPeriodPurchases: purchases.data?.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0) || 0,
      totalPeriodExpenses: expenses.data?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
      recentSales: recentSales.data || [],
      totalReceivable,
      totalPayable,
      partyCount: partiesList.length,
    })
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome to NovaLink! Here&apos;s your shop overview.</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
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

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.phonesCount}</div>
            <p className="text-xs text-muted-foreground">phones available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalPeriodSales)}</div>
            <p className="text-xs text-muted-foreground">{data.periodSalesCount} sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalPeriodProfit)}</div>
            <p className="text-xs text-muted-foreground">gross profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalPeriodExpenses)}</div>
            <p className="text-xs text-muted-foreground">total expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalPeriodPurchases)}</div>
            <p className="text-xs text-muted-foreground">{data.periodPurchasesCount} purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivable</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalReceivable)}</div>
            <p className="text-xs text-muted-foreground">parties owe you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payable</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalPayable)}</div>
            <p className="text-xs text-muted-foreground">you owe parties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.partyCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/parties" className="hover:underline">View all <ArrowUpRight className="inline h-3 w-3" /></Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Recent Sales
            </CardTitle>
            <CardDescription>
              <Link href="/sales" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No sales yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.phones ? `${sale.phones.brand} ${sale.phones.model}` : "N/A"}
                        </TableCell>
                        <TableCell>{sale.customer_name || "N/A"}</TableCell>
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
