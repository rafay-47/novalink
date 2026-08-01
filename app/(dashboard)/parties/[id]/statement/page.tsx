"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Printer } from "lucide-react"
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils"
import type { Party, PartyTransaction } from "@/types/database"

interface StatementData {
  party: Party
  opening_balance: number
  transactions: (PartyTransaction & {
    sales?: {
      phones?: {
        brand: string
        model: string
        imei: string
      } | null
    } | null
    purchases?: {
      phones?: {
        brand: string
        model: string
        imei: string
      } | null
    } | null
  })[]
  closing_balance: number
}

export default function PartyStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<StatementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    fetchStatement()
  }, [id, from, to])

  const fetchStatement = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (from) queryParams.set("from", from)
      if (to) queryParams.set("to", to)

      const response = await fetch(`/api/parties/${id}/statement?${queryParams.toString()}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch statement:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading && !data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading statement...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Statement not found</p>
        <Button variant="outline" onClick={() => router.push(`/parties/${id}`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Party
        </Button>
      </div>
    )
  }

  // Calculate running balance
  let runningBalance = data.opening_balance
  const transactionsWithBalance = data.transactions.map((t) => {
    if (t.type === "credit_sale" || t.type === "payment") {
      runningBalance += t.amount
    } else {
      runningBalance -= t.amount
    }
    return { ...t, running_balance: runningBalance }
  })

  const typeLabels: Record<string, string> = {
    credit_sale: "Sale (Credit)",
    credit_purchase: "Purchase (Credit)",
    receipt: "Receipt",
    payment: "Payment",
    adjustment: "Adjustment",
  }

  return (
    <div className="space-y-4">
      {/* Screen-only controls */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/parties/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Party Statement</h1>
            <p className="text-sm text-muted-foreground">{data.party.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable statement */}
      <div className="p-8 bg-white text-black max-w-2xl mx-auto print-area">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">NOVALINK</h1>
          <p className="text-sm text-gray-600">Party Statement</p>
        </div>

        <div className="border-t border-b border-gray-300 py-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Party: {data.party.name}</p>
              {data.party.contact_person && (
                <p className="text-xs text-gray-600">Contact: {data.party.contact_person}</p>
              )}
              {data.party.phone && (
                <p className="text-xs text-gray-600">Phone: {data.party.phone}</p>
              )}
            </div>
            <div className="text-right">
              {from && <p className="text-xs text-gray-600">From: {from}</p>}
              {to && <p className="text-xs text-gray-600">To: {to}</p>}
              {!from && !to && <p className="text-xs text-gray-600">All Transactions</p>}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Opening Balance:</span>
            <span className={`font-medium ${data.opening_balance > 0 ? "text-green-600" : data.opening_balance < 0 ? "text-red-600" : ""}`}>
              {formatCurrency(data.opening_balance)}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Debit</th>
                <th className="text-right py-2">Credit</th>
                <th className="text-right py-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactionsWithBalance.map((t) => {
                const isDebit = t.type === "credit_sale" || t.type === "payment"
                const phone = (t as any).sales?.phones || (t as any).purchases?.phones
                return (
                  <tr key={t.id} className="border-b">
                    <td className="py-2">{formatDate(t.created_at)}</td>
                    <td className="py-2">{typeLabels[t.type]}</td>
                    <td className="py-2">
                      <div>{t.description || "-"}</div>
                      {phone && (
                        <div className="text-xs text-gray-500">
                          {phone.brand} {phone.model} - {phone.imei}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-right">{isDebit ? formatCurrency(t.amount) : ""}</td>
                    <td className="py-2 text-right">{!isDebit ? formatCurrency(t.amount) : ""}</td>
                    <td className={`py-2 text-right font-medium ${t.running_balance > 0 ? "text-green-600" : t.running_balance < 0 ? "text-red-600" : ""}`}>
                      {formatCurrency(t.running_balance)}
                    </td>
                  </tr>
                )
              })}
              {transactionsWithBalance.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">No transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-300 pt-4 mt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Closing Balance:</span>
            <span className={`text-lg font-bold ${data.closing_balance > 0 ? "text-green-600" : data.closing_balance < 0 ? "text-red-600" : ""}`}>
              {formatCurrency(data.closing_balance)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {data.closing_balance > 0
              ? "Party owes you this amount."
              : data.closing_balance < 0
                ? "You owe the party this amount."
                : "Account is settled."}
          </p>
        </div>

        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>Generated on {formatDateTime(new Date().toISOString())}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  )
}
