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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FileText,
  Pencil,
  Trash2,
  ArrowLeft,
  Receipt,
  CreditCard,
  Settings2,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react"
import { cn, formatCurrency, formatDateTime } from "@/lib/utils"
import { EditPartyDialog } from "@/modules/parties/components/edit-party-dialog"
import { RecordTransactionDialog } from "@/modules/parties/components/record-transaction-dialog"
import Link from "next/link"
import type { Party, PartyTransaction } from "@/types/database"

interface TransactionWithPhone extends PartyTransaction {
  sales?: {
    phone_id: string | null
    phones?: {
      brand: string
      model: string
      imei: string
      color: string | null
      storage: string | null
      ram: string | null
      pta_status: string | null
      condition: string | null
    } | null
  } | null
  purchases?: {
    phone_id: string | null
    phones?: {
      brand: string
      model: string
      imei: string
      color: string | null
      storage: string | null
      ram: string | null
      pta_status: string | null
      condition: string | null
    } | null
  } | null
}

interface SoldPhone {
  transaction: TransactionWithPhone
  phone: {
    brand: string
    model: string
    imei: string
    color: string | null
    storage: string | null
    ram: string | null
    pta_status: string | null
    condition: string | null
  }
  amount: number
  date: string
}

export default function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [party, setParty] = useState<Party & { balance: number } | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithPhone[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"transactions" | "sold" | "purchased" | "info">("transactions")

  useEffect(() => {
    fetchParty()
  }, [id])

  const fetchParty = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/parties/${id}`)
      const data = await response.json()
      setParty(data.party)
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error("Failed to fetch party:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return
    setDeleting(transactionId)
    try {
      const response = await fetch(`/api/parties/${id}/transactions/${transactionId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchParty()
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error)
    } finally {
      setDeleting(null)
    }
  }

  const filteredTransactions = typeFilter
    ? transactions.filter((t) => t.type === typeFilter)
    : transactions

  // Extract sold phones from credit_sale transactions
  const soldPhones: SoldPhone[] = transactions
    .filter((t) => t.type === "credit_sale" && t.sales?.phones)
    .map((t) => ({
      transaction: t,
      phone: t.sales!.phones!,
      amount: t.amount,
      date: t.created_at,
    }))

  const totalSoldAmount = soldPhones.reduce((sum, sp) => sum + sp.amount, 0)

  // Extract purchased phones from credit_purchase transactions
  const purchasedPhones: SoldPhone[] = transactions
    .filter((t) => t.type === "credit_purchase" && t.purchases?.phones)
    .map((t) => ({
      transaction: t,
      phone: t.purchases!.phones!,
      amount: t.amount,
      date: t.created_at,
    }))

  const totalPurchasedAmount = purchasedPhones.reduce((sum, pp) => sum + pp.amount, 0)

  const typeLabels: Record<string, string> = {
    credit_sale: "Credit Sale",
    credit_purchase: "Credit Purchase",
    receipt: "Receipt",
    payment: "Payment",
    adjustment: "Adjustment",
  }

  const typeBadgeVariant = (type: string) => {
    switch (type) {
      case "credit_sale": return "default"
      case "credit_purchase": return "destructive"
      case "receipt": return "default"
      case "payment": return "destructive"
      case "adjustment": return "secondary"
      default: return "secondary"
    }
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton /></div>
  }

  if (!party) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Party not found</p>
        <Button variant="outline" onClick={() => router.push("/parties")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Parties
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/parties")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{party.name}</h1>
            {party.contact_person && (
              <p className="text-sm text-muted-foreground">{party.contact_person}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Link href={`/parties/${id}/statement`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Statement
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Receivable</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(party.balance > 0 ? party.balance : 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Payable</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {formatCurrency(party.balance < 0 ? Math.abs(party.balance) : 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Phones Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{soldPhones.length}</p>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(totalSoldAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Phones Purchased</span>
            </div>
            <p className="text-2xl font-bold mt-1">{purchasedPhones.length}</p>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(totalPurchasedAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "transactions"
              ? "bg-background shadow text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="h-4 w-4" />
          Ledger & Transactions ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sold")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "sold"
              ? "bg-background shadow text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Phone className="h-4 w-4" />
          Devices Sold ({soldPhones.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("purchased")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "purchased"
              ? "bg-background shadow text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Devices Purchased ({purchasedPhones.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "info"
              ? "bg-background shadow text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          Party Details
        </button>
      </div>

      {activeTab === "transactions" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transactions</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setReceiptOpen(true)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Receipt
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAdjustmentOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Adjustment
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant={!typeFilter ? "default" : "outline"}
                onClick={() => setTypeFilter("")}
              >
                All
              </Button>
              {Object.entries(typeLabels).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={typeFilter === key ? "default" : "outline"}
                  onClick={() => setTypeFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => {
                      const isDebit = t.type === "credit_sale" || t.type === "payment"
                      const phone = t.sales?.phones || t.purchases?.phones
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">
                            {formatDateTime(t.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeBadgeVariant(t.type)}>
                              {typeLabels[t.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[250px]">
                            <div>{t.description || "-"}</div>
                            {phone && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {phone.brand} {phone.model} - {phone.imei}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.payment_method || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {isDebit ? formatCurrency(t.amount) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {!isDebit ? formatCurrency(t.amount) : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={deleting === t.id}
                              onClick={() => handleDelete(t.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "sold" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Devices Sold to {party.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {soldPhones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No devices sold to this party yet
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IMEI / Code</TableHead>
                      <TableHead>Specs</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soldPhones.map((sp) => (
                      <TableRow key={sp.transaction.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(sp.date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {sp.phone.brand} {sp.phone.model}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {sp.phone.imei}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {sp.phone.pta_status && (
                              <Badge variant={sp.phone.pta_status === "PTA" ? "default" : "secondary"} className="text-xs">
                                {sp.phone.pta_status}
                              </Badge>
                            )}
                            {sp.phone.condition && (
                              <Badge variant="outline" className="text-xs">
                                {sp.phone.condition}
                              </Badge>
                            )}
                            {sp.phone.storage && (
                              <span className="text-xs text-muted-foreground">{sp.phone.storage}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(sp.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "purchased" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Devices Purchased from {party.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchasedPhones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No devices purchased from this party yet
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IMEI / Code</TableHead>
                      <TableHead>Specs</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasedPhones.map((pp) => (
                      <TableRow key={pp.transaction.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(pp.date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {pp.phone.brand} {pp.phone.model}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {pp.phone.imei}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {pp.phone.pta_status && (
                              <Badge variant={pp.phone.pta_status === "PTA" ? "default" : "secondary"} className="text-xs">
                                {pp.phone.pta_status}
                              </Badge>
                            )}
                            {pp.phone.condition && (
                              <Badge variant="outline" className="text-xs">
                                {pp.phone.condition}
                              </Badge>
                            )}
                            {pp.phone.storage && (
                              <span className="text-xs text-muted-foreground">{pp.phone.storage}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(pp.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "info" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Party Contact & Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Party Name</span>
                <span className="font-medium">{party.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Contact Person</span>
                <span className="font-medium">{party.contact_person || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Phone Number</span>
                <span className="font-medium">{party.phone || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Opening Balance</span>
                <span className="font-medium">{formatCurrency(party.opening_balance || 0)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs">Address</span>
                <span className="font-medium">{party.address || "-"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs">Notes</span>
                <span className="font-medium">{party.notes || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {editOpen && (
        <EditPartyDialog
          party={party}
          open={editOpen}
          onOpenChange={setEditOpen}
          onPartyUpdated={fetchParty}
        />
      )}
      {receiptOpen && (
        <RecordTransactionDialog
          party={party}
          type="receipt"
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          onTransactionRecorded={fetchParty}
        />
      )}
      {paymentOpen && (
        <RecordTransactionDialog
          party={party}
          type="payment"
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onTransactionRecorded={fetchParty}
        />
      )}
      {adjustmentOpen && (
        <RecordTransactionDialog
          party={party}
          type="adjustment"
          open={adjustmentOpen}
          onOpenChange={setAdjustmentOpen}
          onTransactionRecorded={fetchParty}
        />
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-muted rounded animate-pulse" />
        <div>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-muted rounded animate-pulse" />
    </div>
  )
}
