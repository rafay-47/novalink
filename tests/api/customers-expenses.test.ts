import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getCustomers, POST as createCustomer } from "@/app/api/customers/route";
import { GET as getExpenses, POST as createExpense } from "@/app/api/expenses/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Customers & Expenses API (/api/customers & /api/expenses)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Customers API", () => {
    it("GET /api/customers lists all customers", async () => {
      const mockCustomers = [
        { id: "c1", name: "Ahmed Raza", phone: "03001234567" },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockCustomers, count: 1, error: null }),
        }),
      };

      vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

      const response = await getCustomers();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.customers).toHaveLength(1);
    });

    it("POST /api/customers creates a customer", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "c-new", name: "Kashif", phone: "03339998877" },
            error: null,
          }),
        }),
      };

      vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

      const response = await createCustomer(
        new Request("http://localhost:3000/api/customers", {
          method: "POST",
          body: JSON.stringify({ name: "Kashif", phone: "03339998877" }),
        })
      );

      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.customer.name).toBe("Kashif");
    });
  });

  describe("Expenses API", () => {
    it("GET /api/expenses lists all expenses", async () => {
      const mockExpenses = [
        { id: "e1", title: "Rent", amount: 40000, category: "Rent" },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockExpenses, count: 1, error: null }),
        }),
      };

      vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

      const response = await getExpenses();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.expenses).toHaveLength(1);
    });

    it("POST /api/expenses inserts a new expense", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "e-new", title: "Internet Bill", amount: 3500, category: "Internet" },
            error: null,
          }),
        }),
      };

      vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

      const response = await createExpense(
        new Request("http://localhost:3000/api/expenses", {
          method: "POST",
          body: JSON.stringify({ title: "Internet Bill", amount: 3500, category: "Internet" }),
        })
      );

      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.expense.category).toBe("Internet");
    });
  });
});
