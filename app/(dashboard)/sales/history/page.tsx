"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RevertSaleDialog } from "@/components/sales/revert-sale-dialog"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

interface Sale {
  id: string
  invoice_number?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  sale_price?: number | null
  profit?: number | null
  payment_method?: string | null
  created_at?: string
  phones?: { brand?: string; model?: string; item_type?: string | null } | null
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const limit = 20

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/sales?page=${page}&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setSales(data.sales || [])
        setTotal(data.total || 0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  const filteredSales = search
    ? sales.filter((sale) => {
        const q = search.toLowerCase()
        return (
          (sale.phones?.brand || "").toLowerCase().includes(q) ||
          (sale.phones?.model || "").toLowerCase().includes(q) ||
          (sale.customer_name || "").toLowerCase().includes(q) ||
          (sale.invoice_number || "").toLowerCase().includes(q)
        )
      })
    : sales

  const totalPagesCount = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sales History</h1>
        <p className="text-sm text-muted-foreground">All completed sales with revert actions</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Sales</span>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by device, customer, or invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">
                        {sale.invoice_number || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {sale.phones?.brand} {sale.phones?.model}
                        </div>
                        {sale.phones?.item_type && sale.phones.item_type !== "Phone" && (
                          <Badge variant="secondary" className="mt-0.5">
                            {sale.phones.item_type}
                          </Badge>
                        )}
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
                        {formatCurrency(sale.sale_price ?? 0)}
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
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {sales.length} of {total} sale{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPagesCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPagesCount}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}