import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as getTransactions,
  POST as createTransaction,
} from "@/app/api/parties/[id]/transactions/route";
import { DELETE as deleteTransaction } from "@/app/api/parties/[id]/transactions/[transactionId]/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Party Transactions API (/api/parties/[id]/transactions)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET lists transactions for specified party", async () => {
    const mockTx = [
      { id: "tx-1", party_id: "p-10", type: "receipt", amount: 15000 },
      { id: "tx-2", party_id: "p-10", type: "payment", amount: 5000 },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockTx, count: 2, error: null }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/parties/p-10/transactions");
    const response = await getTransactions(request, { params: Promise.resolve({ id: "p-10" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transactions).toHaveLength(2);
  });

  it("POST creates a new receipt or payment transaction for a party", async () => {
    const txData = {
      type: "receipt",
      amount: 20000,
      payment_method: "Cash",
      description: "Payment received from party",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "user@novalink.pk" } } }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "tx-created-1", party_id: "p-10", ...txData, created_by: "user@novalink.pk" },
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/parties/p-10/transactions", {
      method: "POST",
      body: JSON.stringify(txData),
    });

    const response = await createTransaction(request, { params: Promise.resolve({ id: "p-10" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.transaction.amount).toBe(20000);
    expect(body.transaction.type).toBe("receipt");
  });

  it("DELETE deletes party transaction", async () => {
    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      then: (resolve: any) => resolve({ error: null }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue(chain),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/parties/p-10/transactions/tx-1", {
      method: "DELETE",
    });

    const response = await deleteTransaction(request, {
      params: Promise.resolve({ id: "p-10", transactionId: "tx-1" }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
