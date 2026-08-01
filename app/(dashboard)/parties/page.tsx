"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, Handshake, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { AddPartyDialog } from "@/modules/parties/components/add-party-dialog"
import Link from "next/link"
import type { Party } from "@/types/database"

interface PartyWithBalance extends Party {
  balance: number
}

export default function PartiesPage() {
  const [parties, setParties] = useState<PartyWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchParties()
  }, [])

  const fetchParties = async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ""
      const response = await fetch(`/api/parties${params}`)
      const data = await response.json()
      setParties(data.parties || [])
    } catch (error) {
      console.error("Failed to fetch parties:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (value: string) => {
    setSearch(value)
    setLoading(true)
    try {
      const params = value ? `?search=${encodeURIComponent(value)}` : ""
      const response = await fetch(`/api/parties${params}`)
      const data = await response.json()
      setParties(data.parties || [])
    } catch (error) {
      console.error("Failed to search parties:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalReceivable = parties
    .filter((p) => p.balance > 0)
    .reduce((sum, p) => sum + p.balance, 0)

  const totalPayable = parties
    .filter((p) => p.balance < 0)
    .reduce((sum, p) => sum + Math.abs(p.balance), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parties / Dealers</h1>
          <p className="text-sm text-muted-foreground">
            Manage dealer accounts and settlements
          </p>
        </div>
        <AddPartyDialog onPartyAdded={fetchParties} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Receivable</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalReceivable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Total Payable</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalPayable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Parties</span>
            </div>
            <p className="text-2xl font-bold mt-1">{parties.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Party List
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parties..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : parties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No parties found. Add a party to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  parties.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell>
                        <Link
                          href={`/parties/${party.id}`}
                          className="font-medium hover:underline"
                        >
                          {party.name}
                        </Link>
                        {party.contact_person && (
                          <p className="text-xs text-muted-foreground">{party.contact_person}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{party.contact_person || "-"}</TableCell>
                      <TableCell className="text-sm">{party.phone || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {party.address || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={party.balance > 0 ? "default" : party.balance < 0 ? "destructive" : "secondary"}
                        >
                          {party.balance > 0 ? "+" : ""}
                          {formatCurrency(party.balance)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(party.created_at)}
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
