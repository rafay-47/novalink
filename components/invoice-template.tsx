"use client"

import { formatCurrency, formatDateTime } from "@/lib/utils"

interface InvoiceData {
  invoice_number: string
  sale_price: number
  profit: number | null
  payment_method: string
  customer_name: string | null
  customer_phone: string | null
  created_at: string
  phones?: {
    brand: string
    model: string
    imei: string
    color: string | null
    storage: string | null
    ram: string | null
    pta_status: string | null
    condition: string | null
  }
}

interface InvoiceTemplateProps {
  invoice: InvoiceData
}

export function InvoiceTemplate({ invoice }: InvoiceTemplateProps) {
  return (
    <div className="p-8 bg-white text-black max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">NOVALINK</h1>
        <p className="text-sm text-gray-600">Your Trusted Mobile Partner</p>
        <p className="text-sm text-gray-600">Phone: 03XX-XXXXXXX</p>
        <p className="text-sm text-gray-600">Address: Shop Address Here</p>
      </div>

      <div className="border-t border-b border-gray-300 py-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Invoice #: {invoice.invoice_number}</p>
            <p className="text-xs text-gray-600">Date: {formatDateTime(invoice.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Customer</p>
            <p className="text-xs text-gray-600">{invoice.customer_name || "Walk-in Customer"}</p>
            {invoice.customer_phone && (
              <p className="text-xs text-gray-600">{invoice.customer_phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">Item Details</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Brand/Model</p>
              <p className="font-medium">
                {invoice.phones?.brand} {invoice.phones?.model}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">IMEI</p>
              <p className="font-mono text-sm">{invoice.phones?.imei}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600">Color</p>
              <p className="text-sm">{invoice.phones?.color || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Storage</p>
              <p className="text-sm">{invoice.phones?.storage || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">RAM</p>
              <p className="text-sm">{invoice.phones?.ram || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Condition</p>
              <p className="text-sm">{invoice.phones?.condition || "-"}</p>
            </div>
          </div>
          {invoice.phones?.pta_status && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-600">PTA Status</p>
              <p className="font-medium">{invoice.phones.pta_status}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">Payment Details</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium">{invoice.payment_method}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-300 pt-4 mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg">Total Amount:</span>
          <span className="text-2xl font-bold">{formatCurrency(invoice.sale_price)}</span>
        </div>
        {invoice.profit !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-600">Profit:</span>
            <span className="text-sm font-medium text-green-600">+{formatCurrency(invoice.profit)}</span>
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
        <p>Thank you for your purchase!</p>
        <p>Goods once sold will not be exchanged or returned.</p>
        <p className="mt-2">For any queries, please contact us with your invoice number.</p>
      </div>
    </div>
  )
}

export function PrintInvoice({ invoice }: InvoiceTemplateProps) {
  return (
    <>
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
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
      <div className="print-area">
        <InvoiceTemplate invoice={invoice} />
      </div>
    </>
  )
}