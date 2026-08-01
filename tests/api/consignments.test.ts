import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getConsignments, POST as createConsignment } from "@/app/api/consignments/route";
import { POST as returnConsignment } from "@/app/api/consignments/[id]/return/route";
import { POST as sellConsignment } from "@/app/api/consignments/[id]/sell/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Party Consignments API (/api/consignments)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/consignments lists all phones with status Reserved", async () => {
    const mockConsignments = [
      {
        id: "phone-1",
        brand: "Apple",
        model: "iPhone 14 Pro",
        imei: "112233445566778",
        status: "Reserved",
        reserved_party_id: "party-1",
        party: { id: "party-1", name: "Ali Communications" },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockConsignments, error: null }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getConsignments();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.consignments).toHaveLength(1);
    expect(body.consignments[0].brand).toBe("Apple");
    expect(body.consignments[0].party.name).toBe("Ali Communications");
  });

  it("POST /api/consignments updates phone status to Reserved with reserved_party_id", async () => {
    const mockPhone = { id: "phone-100", brand: "OnePlus", status: "In Stock" };
    const mockUpdatedPhone = {
      id: "phone-100",
      status: "Reserved",
      reserved_party_id: "party-500",
      party: { id: "party-500", name: "Star Traders" },
    };

    const updateSpy = vi.fn();

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "admin@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "phones") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPhone, error: null }),
            update: (payload: any) => {
              updateSpy(payload);
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockUpdatedPhone, error: null }),
                  }),
                }),
              };
            },
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await createConsignment(
      new Request("http://localhost:3000/api/consignments", {
        method: "POST",
        body: JSON.stringify({ phone_id: "phone-100", party_id: "party-500" }),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.consignment.status).toBe("Reserved");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Reserved",
        reserved_party_id: "party-500",
      })
    );
  });

  it("POST /api/consignments/[id]/return resets phone status to In Stock and clears reserved_party_id", async () => {
    const mockReservedPhone = { id: "phone-200", status: "Reserved", reserved_party_id: "party-1" };
    const updateMock = vi.fn().mockReturnThis();

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "admin@novalink.pk" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: mockReservedPhone, error: null })
          .mockResolvedValueOnce({ data: { ...mockReservedPhone, status: "In Stock", reserved_party_id: null }, error: null }),
        update: updateMock,
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await returnConsignment(
      new Request("http://localhost:3000/api/consignments/phone-200/return", { method: "POST" }),
      { params: Promise.resolve({ id: "phone-200" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "In Stock",
        reserved_party_id: null,
        reserved_at: null,
      })
    );
  });

  it("POST /api/consignments/[id]/sell converts consignment to completed sale and updates status to Sold", async () => {
    const mockConsignmentPhone = {
      id: "phone-300",
      brand: "Vivo",
      model: "V29",
      purchase_price: 60000,
      status: "Reserved",
      reserved_party_id: "party-777",
    };

    const insertedSale = { id: "sale-999", sale_price: 75000, profit: 15000, invoice_number: "INV-999" };
    const partyTxMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "admin@novalink.pk" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "phones") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockConsignmentPhone, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === "parties") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: "Al-Madina Mobiles" }, error: null }),
          };
        }
        if (table === "sales") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: insertedSale, error: null }),
          };
        }
        if (table === "party_transactions") {
          return {
            insert: partyTxMock,
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await sellConsignment(
      new Request("http://localhost:3000/api/consignments/phone-300/sell", {
        method: "POST",
        body: JSON.stringify({
          sale_price: 75000,
          payment_method: "Cash",
          amount_paid: 25000, // Remaining balance = 50,000 credit sale
        }),
      }),
      { params: Promise.resolve({ id: "phone-300" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(partyTxMock).toHaveBeenCalledWith(
      expect.objectContaining({
        party_id: "party-777",
        type: "credit_sale",
        amount: 50000,
      })
    );
  });
});
