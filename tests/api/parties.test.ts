import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getParties, POST as createParty } from "@/app/api/parties/route";
import {
  GET as getPartyById,
  PATCH as updateParty,
  DELETE as deleteParty,
} from "@/app/api/parties/[id]/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Parties API & Deletion Guard (/api/parties)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/parties maps party balance from party_balances view", async () => {
    const mockParties = [
      { id: "party-1", name: "Al-Madina Traders", opening_balance: 10000 },
    ];
    const mockBalances = [
      { party_id: "party-1", balance: 45000 },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "parties") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockParties, error: null }),
          };
        }
        if (table === "party_balances") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockBalances, error: null }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await getParties(new Request("http://localhost:3000/api/parties"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.parties).toHaveLength(1);
    expect(body.parties[0].balance).toBe(45000);
  });

  it("POST /api/parties creates party with opening balance", async () => {
    const newParty = {
      name: "Standard Mobile Shop",
      contact_person: "Bilal",
      phone: "03211234567",
      opening_balance: 25000,
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "party-new-1", ...newParty },
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await createParty(
      new Request("http://localhost:3000/api/parties", {
        method: "POST",
        body: JSON.stringify(newParty),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.party.name).toBe("Standard Mobile Shop");
  });

  it("DELETE /api/parties/[id] blocks deletion if party has existing transactions", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "party_transactions") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 5, data: null, error: null }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await deleteParty(
      new Request("http://localhost:3000/api/parties/party-with-tx", { method: "DELETE" }),
      { params: Promise.resolve({ id: "party-with-tx" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Cannot delete party with existing transactions");
  });

  it("DELETE /api/parties/[id] allows deletion if transaction count is 0", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "party_transactions") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }),
          };
        }
        if (table === "parties") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const response = await deleteParty(
      new Request("http://localhost:3000/api/parties/party-clean", { method: "DELETE" }),
      { params: Promise.resolve({ id: "party-clean" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
