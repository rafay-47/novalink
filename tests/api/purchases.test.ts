import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getPurchases, POST as createPurchase } from "@/app/api/purchases/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Purchases API & Linked Phone Creation (/api/purchases)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/purchases lists all purchases with phone details", async () => {
    const mockPurchases = [
      {
        id: "purchase-1",
        phone_id: "phone-1",
        seller_name: "Vendor A",
        purchase_price: 80000,
        phones: { brand: "Xiaomi", model: "13T", imei: "12345" },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockPurchases,
          count: 1,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getPurchases(new Request("http://localhost:3000/api/purchases"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purchases).toHaveLength(1);
    expect(body.purchases[0].phones.brand).toBe("Xiaomi");
  });

  it("POST /api/purchases creates phone in inventory AND links it to purchase record", async () => {
    const insertedPhone = { id: "phone-uuid-777", brand: "Google", model: "Pixel 7", status: "In Stock" };
    const insertedPurchase = { id: "purchase-uuid-888", phone_id: insertedPhone.id, seller_name: "Imran", purchase_price: 95000 };

    const phonesInsertMock = vi.fn().mockReturnThis();
    const purchasesInsertMock = vi.fn().mockReturnThis();

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "admin@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "phones") {
          return {
            insert: phonesInsertMock,
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: insertedPhone, error: null }),
          };
        }
        if (table === "purchases") {
          return {
            insert: purchasesInsertMock,
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: insertedPurchase, error: null }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const purchasePayload = {
      brand: "Google",
      model: "Pixel 7",
      imei: "998877665544332",
      condition: "Used",
      pta_status: "PTA",
      seller_name: "Imran",
      seller_phone: "03001112233",
      purchase_price: 95000,
      payment_method: "Cash",
    };

    const response = await createPurchase(
      new Request("http://localhost:3000/api/purchases", {
        method: "POST",
        body: JSON.stringify(purchasePayload),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.phone).toBeDefined();
    expect(body.purchase).toBeDefined();
    expect(phonesInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "Google",
        model: "Pixel 7",
        imei: "998877665544332",
        status: "In Stock",
      })
    );
    expect(purchasesInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_id: "phone-uuid-777",
        seller_name: "Imran",
        purchase_price: 95000,
      })
    );
  });

  it("POST /api/purchases dual-writes credit_purchase transaction to party_transactions when party_id is provided", async () => {
    const insertedPhone = { id: "phone-uuid-111" };
    const insertedPurchase = { id: "purchase-uuid-222" };
    const partyTxInsertMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "admin@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "phones") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: insertedPhone, error: null }),
          };
        }
        if (table === "purchases") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: insertedPurchase, error: null }),
          };
        }
        if (table === "parties") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: "Dealer Shop" }, error: null }),
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
      brand: "Samsung",
      model: "S22",
      imei: "354433221100998",
      condition: "Used",
      seller_name: "Dealer Shop",
      purchase_price: 100000,
      payment_method: "Cash",
      party_id: "party-uuid-99",
      amount_paid: 60000, // Remaining balance = 40,000
    };

    const response = await createPurchase(
      new Request("http://localhost:3000/api/purchases", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(201);
    expect(partyTxInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        party_id: "party-uuid-99",
        type: "credit_purchase",
        amount: 40000,
        reference_id: "purchase-uuid-222",
        reference_type: "purchase",
      })
    );
  });
});
