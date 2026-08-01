import { describe, it, expect } from "vitest";
import {
  phoneSchema,
  customerSchema,
  purchaseSchema,
  saleSchema,
  expenseSchema,
  partySchema,
  partyTransactionSchema,
  loginSchema,
  signUpSchema,
} from "@/lib/validations";

describe("Validation Schemas (lib/validations.ts)", () => {
  describe("phoneSchema", () => {
    it("validates correct phone data", () => {
      const validPhone = {
        brand: "Apple",
        model: "iPhone 15 Pro",
        imei: "358765432109876",
        color: "Natural Titanium",
        ram: "8GB",
        storage: "256GB",
        battery_health: "98%",
        condition: "Used",
        pta_status: "PTA",
        purchase_price: 250000,
        sale_price: 285000,
        status: "In Stock",
        notes: "Mint condition",
      };

      const result = phoneSchema.safeParse(validPhone);
      expect(result.success).toBe(true);
    });

    it("fails when required fields are missing", () => {
      const invalidPhone = {
        brand: "",
        model: "iPhone 15",
        imei: "",
        condition: "New",
      };

      const result = phoneSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.brand).toBeDefined();
        expect(fieldErrors.imei).toBeDefined();
      }
    });

    it("rejects invalid condition enum values", () => {
      const result = phoneSchema.safeParse({
        brand: "Samsung",
        model: "S24 Ultra",
        imei: "123456789012345",
        condition: "Super New",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("customerSchema", () => {
    it("validates customer with name and optional fields", () => {
      const result = customerSchema.safeParse({
        name: "John Doe",
        phone: "03001234567",
        address: "Lahore, Pakistan",
      });
      expect(result.success).toBe(true);
    });

    it("rejects customer without name", () => {
      const result = customerSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("purchaseSchema", () => {
    it("validates full purchase schema", () => {
      const validPurchase = {
        brand: "Google",
        model: "Pixel 8 Pro",
        imei: "990011223344556",
        condition: "Used",
        pta_status: "NON-PTA",
        seller_name: "Ali Khan",
        seller_phone: "03129876543",
        seller_cnic: "35202-1234567-1",
        purchase_price: 150000,
        payment_method: "Cash",
        party_id: "party-uuid-123",
        amount_paid: 100000,
        notes: "Clear screen",
      };
      const result = purchaseSchema.safeParse(validPurchase);
      expect(result.success).toBe(true);
    });

    it("fails when purchase price is 0 or negative", () => {
      const invalidPurchase = {
        brand: "Xiaomi",
        model: "Redmi Note 13",
        imei: "112233445566778",
        condition: "New",
        seller_name: "Shopkeeper",
        purchase_price: 0,
        payment_method: "Cash",
      };
      const result = purchaseSchema.safeParse(invalidPurchase);
      expect(result.success).toBe(false);
    });
  });

  describe("saleSchema", () => {
    it("validates sale with customer name", () => {
      const validSale = {
        phone_id: "phone-123",
        customer_name: "Usman",
        customer_phone: "03017654321",
        sale_price: 180000,
        payment_method: "Cash",
      };
      const result = saleSchema.safeParse(validSale);
      expect(result.success).toBe(true);
    });

    it("validates sale with party_id instead of customer_name", () => {
      const validPartySale = {
        phone_id: "phone-456",
        party_id: "party-789",
        sale_price: 200000,
        amount_paid: 150000,
        payment_method: "Transfer",
      };
      const result = saleSchema.safeParse(validPartySale);
      expect(result.success).toBe(true);
    });

    it("refuses sale when NEITHER customer_name NOR party_id is supplied", () => {
      const invalidSale = {
        phone_id: "phone-123",
        sale_price: 150000,
        payment_method: "Cash",
      };
      const result = saleSchema.safeParse(invalidSale);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.customer_name).toBeDefined();
      }
    });
  });

  describe("expenseSchema", () => {
    it("validates correct expense entry", () => {
      const validExpense = {
        title: "Shop Monthly Electricity Bill",
        amount: 25000,
        category: "Electricity",
        notes: "Paid via online banking",
      };
      const result = expenseSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it("rejects expense with non-existent category", () => {
      const invalidExpense = {
        title: "Marketing",
        amount: 5000,
        category: "MarketingCampaign",
      };
      const result = expenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });
  });

  describe("partySchema and partyTransactionSchema", () => {
    it("validates party creation data", () => {
      const validParty = {
        name: "Metro Telecom",
        contact_person: "Tariq Sahib",
        phone: "03004445556",
        address: "Hafeez Center, Lahore",
        opening_balance: 50000,
      };
      const result = partySchema.safeParse(validParty);
      expect(result.success).toBe(true);
    });

    it("validates all party transaction types", () => {
      const types = ["credit_sale", "credit_purchase", "receipt", "payment", "adjustment"] as const;
      for (const type of types) {
        const result = partyTransactionSchema.safeParse({
          party_id: "party-uuid",
          type,
          amount: 10000,
          payment_method: "Cash",
          description: `Test transaction ${type}`,
        });
        expect(result.success).toBe(true);
      }
    });

    it("fails when transaction amount is 0 or negative", () => {
      const result = partyTransactionSchema.safeParse({
        party_id: "party-uuid",
        type: "payment",
        amount: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema and signUpSchema", () => {
    it("validates login credentials", () => {
      expect(loginSchema.safeParse({ email: "admin@novalink.pk", password: "password123" }).success).toBe(true);
      expect(loginSchema.safeParse({ email: "invalid-email", password: "123" }).success).toBe(false);
    });

    it("validates signup details including full_name", () => {
      expect(
        signUpSchema.safeParse({
          email: "owner@novalink.pk",
          password: "securepassword",
          full_name: "Owner Name",
        }).success
      ).toBe(true);

      expect(
        signUpSchema.safeParse({
          email: "owner@novalink.pk",
          password: "securepassword",
          full_name: "",
        }).success
      ).toBe(false);
    });
  });
});
