"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { createClient as createBrowserClient } from "@/lib/supabase/client"

interface DashboardData {
  phonesCount: number
  todaySalesCount: number
  totalTodaySales: number
  totalTodayProfit: number
  todayPurchasesCount: number
  totalTodayPurchases: number
  recentSales: any[]
  lowStock: any[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const [phonesCount, todaySales, todayPurchases, recentSales, lowStock] = await Promise.all([
        supabase
          .from("phones")
          .select("*", { count: "exact", head: true })
          .eq("status", "In Stock"),
        supabase
          .from("sales")
          .select("*, phones(brand, model)")
          .gte("created_at", todayStr)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("purchases")
          .select("*")
          .gte("created_at", todayStr)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("sales")
          .select("*, phones(brand, model)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("phones")
          .select("*")
          .eq("status", "In Stock")
          .order("created_at", { ascending: true })
          .limit(10),
      ])

      setData({
        phonesCount: phonesCount.count || 0,
        todaySalesCount: todaySales.data?.length || 0,
        totalTodaySales: todaySales.data?.reduce((sum: number, s: any) => sum + (s.sale_price || 0), 0) || 0,
        totalTodayProfit: todaySales.data?.reduce((sum: number, s: any) => sum + (s.profit || 0), 0) || 0,
        todayPurchasesCount: todayPurchases.data?.length || 0,
        totalTodayPurchases: todayPurchases.data?.reduce((sum: number, p: any) => sum + (p.purchase_price || 0), 0) || 0,
        recentSales: recentSales.data || [],
        lowStock: lowStock.data || [],
      })
    }

    loadData()
  }, [])

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
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome to NovaLink! Here&apos;s your shop overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalTodaySales)}</div>
            <p className="text-xs text-muted-foreground">{data.todaySalesCount} sales today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalTodayProfit)}</div>
            <p className="text-xs text-muted-foreground">gross profit today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.phonesCount < 10 ? data.phonesCount : 0}</div>
            <p className="text-xs text-muted-foreground">items in stock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Low Stock Items
            </CardTitle>
            <CardDescription>
              <Link href="/inventory" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View inventory
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
                    <TableHead>IMEI</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No inventory items
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.lowStock.map((phone) => (
                      <TableRow key={phone.id}>
                        <TableCell className="font-medium">
                          {phone.brand} {phone.model}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{phone.imei}</TableCell>
                        <TableCell>
                          <Badge variant={phone.status === "In Stock" ? "default" : "secondary"}>
                            {phone.status}
                          </Badge>
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
  )
}
