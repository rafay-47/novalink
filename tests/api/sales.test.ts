import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getSales, POST as createSale } from "@/app/api/sales/route";
import { POST as revertSale } from "@/app/api/sales/[id]/revert/route";
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
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockSales,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getSales(new Request("http://localhost:3000/api/sales"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sales).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("GET /api/sales?category=accessories returns only Adapter/Cable sales", async () => {
    const mockSales = [
      { id: "s2", sale_price: 800, phones: { brand: "Anker", model: "20W", item_type: "Adapter" } },
      { id: "s3", sale_price: 300, phones: { brand: "Belkin", model: "Type-C", item_type: "Cable" } },
      { id: "s4", sale_price: 130000, phones: { brand: "Apple", model: "iPhone 15", item_type: "Phone" } },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockSales,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getSales(
      new Request("http://localhost:3000/api/sales?category=accessories")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sales).toHaveLength(2);
    expect(body.sales.map((s: { phones: { item_type: string } }) => s.phones.item_type)).toEqual([
      "Adapter",
      "Cable",
    ]);
  });

  it("GET /api/sales?category=phones excludes Adapter/Cable sales", async () => {
    const mockSales = [
      { id: "s2", sale_price: 800, phones: { brand: "Anker", model: "20W", item_type: "Adapter" } },
      { id: "s3", sale_price: 300, phones: { brand: "Belkin", model: "Type-C", item_type: "Cable" } },
      { id: "s4", sale_price: 130000, phones: { brand: "Apple", model: "iPhone 15", item_type: "Phone" } },
      { id: "s5", sale_price: 90000, phones: { brand: "Samsung", model: "A54", item_type: null } },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockSales,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getSales(
      new Request("http://localhost:3000/api/sales?category=phones")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sales).toHaveLength(2);
    expect(body.sales.map((s: { id: string }) => s.id)).toEqual(["s4", "s5"]);
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

  it("POST /api/sales assigns custom backdated created_at to sale and party_transactions", async () => {
    const saleInsertMock = vi.fn().mockReturnThis();
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
            insert: saleInsertMock,
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "sale-303",
                sale_price: 180000,
                customer_name: "United Mobiles",
                created_at: "2026-08-10T12:00:00.000Z",
              },
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
      phone_id: "phone-3",
      party_id: "party-55",
      sale_price: 180000,
      amount_paid: 100000,
      payment_method: "Cash",
      date_option: "custom",
      sale_date: "2026-08-10",
    };

    const response = await createSale(
      new Request("http://localhost:3000/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(201);
    // Verify sales record was inserted with created_at starting with the custom date
    expect(saleInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        created_at: expect.stringMatching(/^2026-08-10/),
      })
    );
    // Verify party_transactions record was inserted with matching backdated created_at
    expect(partyTxInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        party_id: "party-55",
        type: "credit_sale",
        amount: 80000,
        sale_id: "sale-303",
        created_at: expect.stringMatching(/^2026-08-10/),
      })
    );
  });
});

describe("POST /api/sales/[id]/revert", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const revertRequest = (id: string) =>
    new Request(`http://localhost:3000/api/sales/${id}/revert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Customer returned device" }),
    });

  it("soft-deletes the sale, removes linked party credit, and restores the phone to stock", async () => {
    const salesSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "sale-1", phone_id: "phone-1", sale_price: 130000, phones: { item_type: "Phone" } },
      error: null,
    });
    const salesUpdateSingle = vi.fn().mockResolvedValue({
      data: { id: "sale-1", status: "reversed", reversed_by: "admin@novalink.pk" },
      error: null,
    });
    const partyTxDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const phoneUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const phoneUpdate = vi.fn().mockReturnValue({ eq: () => ({ eq: phoneUpdateEq }) });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "user@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "sales") {
          return {
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: salesSelectSingle }) }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({ single: salesUpdateSingle }),
                }),
              }),
            }),
          };
        }
        if (table === "party_transactions") {
          return {
            delete: vi.fn().mockReturnValue({ eq: partyTxDeleteEq }),
          };
        }
        if (table === "phones") {
          return { update: phoneUpdate };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await revertSale(revertRequest("sale-1"), {
      params: Promise.resolve({ id: "sale-1" }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sale.status).toBe("reversed");

    // Verify soft-delete update predicate
    expect(salesUpdateSingle).toHaveBeenCalled();

    // Verify party credit removal
    expect(partyTxDeleteEq).toHaveBeenCalledWith("sale_id", "sale-1");

    // Verify phone restored to stock only for sold phones
    expect(phoneUpdate).toHaveBeenCalledWith({ status: "In Stock" });
    expect(phoneUpdateEq).toHaveBeenCalled();
  });

  it("does not restore phone to stock for accessory sales (non-Phone item type)", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "user@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "sales") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "sale-2", phone_id: "phone-2", sale_price: 500, phones: { item_type: "Adapter" } },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: "sale-2", status: "reversed" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "party_transactions") {
          return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === "phones") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await revertSale(revertRequest("sale-2"), {
      params: Promise.resolve({ id: "sale-2" }),
    } as any);

    expect(response.status).toBe(200);
    // phone.update should not have been invoked for accessories
    expect(mockSupabase.from).not.toHaveBeenCalledWith("phones");
  });

  it("returns 400 when the sale is already reversed", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "user@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "sales") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "sale-3", phone_id: "phone-3", sale_price: 1000, phones: { item_type: "Phone" } },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await revertSale(revertRequest("sale-3"), {
      params: Promise.resolve({ id: "sale-3" }),
    } as any);

    expect(response.status).toBe(400);
  });
});
