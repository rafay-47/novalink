import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getPhones, POST as createPhone } from "@/app/api/phones/route";
import {
  GET as getPhoneById,
  PATCH as updatePhone,
  DELETE as deletePhone,
} from "@/app/api/phones/[id]/route";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server");

describe("Phones API Routes (/api/phones)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/phones returns phone list and total count", async () => {
    const mockPhones = [
      { id: "p1", brand: "Apple", model: "iPhone 13", imei: "123456789012345", status: "In Stock" },
      { id: "p2", brand: "Samsung", model: "S23", imei: "987654321098765", status: "Sold" },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockPhones,
          count: 2,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones");
    const response = await getPhones(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.phones).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("GET /api/phones?item_type=accessories filters for adapters and cables", async () => {
    const mockAccessories = [
      { id: "a1", brand: "Anker", model: "20W Charger", item_type: "Adapter", status: "In Stock" },
      { id: "c1", brand: "Apple", model: "USB-C Cable", item_type: "Cable", status: "In Stock" },
    ];

    const inMock = vi.fn().mockReturnThis();
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: inMock,
        range: vi.fn().mockResolvedValue({
          data: mockAccessories,
          count: 2,
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones?item_type=accessories&limit=1000");
    const response = await getPhones(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.phones).toHaveLength(2);
    expect(inMock).toHaveBeenCalledWith("item_type", ["Adapter", "Cable", "adapter", "cable"]);
  });

  it("POST /api/phones creates a new phone entry", async () => {
    const newPhone = {
      brand: "OnePlus",
      model: "12R",
      imei: "112233445566778",
      condition: "New",
      pta_status: "PTA",
      purchase_price: 120000,
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "phone-new-123", ...newPhone, status: "In Stock" },
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones", {
      method: "POST",
      body: JSON.stringify(newPhone),
    });

    const response = await createPhone(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.phone).toBeDefined();
    expect(body.phone.brand).toBe("OnePlus");
  });

  it("POST /api/phones returns 401 Unauthorized if user is not authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones", {
      method: "POST",
      body: JSON.stringify({ brand: "Apple", model: "iPhone 15", imei: "123", condition: "New" }),
    });

    const response = await createPhone(request);
    expect(response.status).toBe(401);
  });

  it("GET /api/phones/[id] returns phone details or 404", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "p1", brand: "Apple", model: "iPhone 14", imei: "123" },
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones/p1");
    const response = await getPhoneById(request, { params: Promise.resolve({ id: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.phone.id).toBe("p1");
  });

  it("PATCH /api/phones/[id] updates phone details", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "p1", brand: "Apple", model: "iPhone 14 Pro", imei: "123", condition: "Used" },
          error: null,
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones/p1", {
      method: "PATCH",
      body: JSON.stringify({ brand: "Apple", model: "iPhone 14 Pro", imei: "123", condition: "Used" }),
    });

    const response = await updatePhone(request, { params: Promise.resolve({ id: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.phone.model).toBe("iPhone 14 Pro");
  });

  it("POST /api/phones creates accessory (Adapter) with auto-generated barcode when IMEI is omitted", async () => {
    const newAdapter = {
      item_type: "Adapter",
      brand: "Anker",
      model: "20W Charger",
      purchase_price: 2500,
    };

    let insertedData: any = null;
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((payload) => {
          insertedData = payload;
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "acc-1", ...payload },
              error: null,
            }),
          };
        }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones", {
      method: "POST",
      body: JSON.stringify(newAdapter),
    });

    const response = await createPhone(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.phone).toBeDefined();
    expect(body.phone.item_type).toBe("Adapter");
    expect(body.phone.imei).toMatch(/^ACC-/);
  });

  it("DELETE /api/phones/[id] deletes specified phone", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(mockSupabase as any);

    const request = new Request("http://localhost:3000/api/phones/p1", {
      method: "DELETE",
    });

    const response = await deletePhone(request, { params: Promise.resolve({ id: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
