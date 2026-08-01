import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getSales, POST as createSale } from "@/app/api/sales/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Sales API & Linked Entity State Updates (/api/sales)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/sales returns paginated sales", async () => {
    const mockSales = [
      { id: "s1", sale_price: 150000, profit: 20000, invoice_number: "INV-1" },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockSales,
          count: 1,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getSales(new Request("http://localhost:3000/api/sales"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sales).toHaveLength(1);
  });

  it("POST /api/sales calculates profit correctly and updates phone status to 'Sold'", async () => {
    const phoneUpdateMock = vi.fn().mockReturnThis();
    const phoneEqMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "seller@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "phones") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { purchase_price: 100000 }, error: null }),
            update: phoneUpdateMock.mockReturnValue({ eq: phoneEqMock }),
          };
        }
        if (table === "sales") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: "sale-101",
                phone_id: "phone-1",
                sale_price: 130000,
                profit: 30000, // 130,000 - 100,000
                sold_by: "seller@novalink.pk",
                invoice_number: "INV-TEST-123",
              },
              error: null,
            })),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const payload = {
      phone_id: "phone-1",
      customer_name: "Asad",
      customer_phone: "03001234567",
      sale_price: 130000,
      payment_method: "Cash",
    };

    const response = await createSale(
      new Request("http://localhost:3000/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.sale).toBeDefined();
    expect(body.sale.profit).toBe(30000);
    // Verify phone status update to 'Sold'
    expect(phoneUpdateMock).toHaveBeenCalledWith({ status: "Sold" });
    expect(phoneEqMock).toHaveBeenCalledWith("id", "phone-1");
  });

  it("POST /api/sales creates dual credit_sale transaction when party_id is specified", async () => {
    const partyTxInsertMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "seller@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "phones") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { purchase_price: 150000 }, error: null }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === "parties") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: "United Mobiles" }, error: null }),
          };
        }
        if (table === "sales") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "sale-202", sale_price: 180000, customer_name: "United Mobiles" },
              error: null,
            }),
          };
        }
        if (table === "party_transactions") {
          return {
            insert: partyTxInsertMock,
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const payload = {
      phone_id: "phone-2",
      party_id: "party-55",
      sale_price: 180000,
      amount_paid: 100000, // Remaining balance = 80,000
      payment_method: "Transfer",
    };

    const response = await createSale(
      new Request("http://localhost:3000/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(201);
    expect(partyTxInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        party_id: "party-55",
        type: "credit_sale",
        amount: 80000,
        reference_id: "sale-202",
        sale_id: "sale-202",
      })
    );
  });
});
