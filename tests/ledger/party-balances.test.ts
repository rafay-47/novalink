import { describe, it, expect } from "vitest";

export interface Transaction {
  id: string;
  type: "credit_sale" | "credit_purchase" | "receipt" | "payment" | "adjustment";
  amount: number;
}

export function calculatePartyBalance(
  openingBalance: number,
  transactions: Transaction[]
): number {
  const transactionTotal = transactions.reduce((acc, t) => {
    switch (t.type) {
      case "credit_sale":
      case "payment":
        return acc + t.amount;
      case "credit_purchase":
      case "receipt":
      case "adjustment":
        return acc - t.amount;
      default:
        return acc;
    }
  }, 0);

  return openingBalance + transactionTotal;
}

describe("Party Balance & Ledger Recalculation Integrity", () => {
  it("calculates balance starting with opening_balance of 0", () => {
    const balance = calculatePartyBalance(0, []);
    expect(balance).toBe(0);
  });

  it("increases balance when a credit_sale is registered", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "credit_sale", amount: 150000 },
    ];
    const balance = calculatePartyBalance(0, transactions);
    expect(balance).toBe(150000); // Party owes us 150,000
  });

  it("decreases balance when a receipt (payment from party) is received", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "credit_sale", amount: 150000 },
      { id: "2", type: "receipt", amount: 50000 },
    ];
    const balance = calculatePartyBalance(0, transactions);
    expect(balance).toBe(100000); // Party now owes 100,000
  });

  it("decreases balance when a credit_purchase is made from dealer", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "credit_purchase", amount: 200000 },
    ];
    const balance = calculatePartyBalance(0, transactions);
    expect(balance).toBe(-200000); // We owe party 200,000
  });

  it("increases balance when we make a payment to dealer", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "credit_purchase", amount: 200000 },
      { id: "2", type: "payment", amount: 120000 },
    ];
    const balance = calculatePartyBalance(0, transactions);
    expect(balance).toBe(-80000); // We now owe party 80,000
  });

  it("correctly handles adjustment entries", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "credit_sale", amount: 50000 },
      { id: "2", type: "adjustment", amount: 5000 }, // Discount/adjustment reduces balance
    ];
    const balance = calculatePartyBalance(0, transactions);
    expect(balance).toBe(45000);
  });

  it("dynamically updates party balance when transaction amounts are modified", () => {
    let transactions: Transaction[] = [
      { id: "1", type: "credit_sale", amount: 100000 },
      { id: "2", type: "receipt", amount: 30000 },
    ];

    expect(calculatePartyBalance(10000, transactions)).toBe(80000);

    // Simulate updating credit_sale amount from 100000 to 120000
    transactions = transactions.map((t) =>
      t.id === "1" ? { ...t, amount: 120000 } : t
    );

    expect(calculatePartyBalance(10000, transactions)).toBe(100000);
  });

  it("dynamically updates balance when a transaction is removed", () => {
    let transactions: Transaction[] = [
      { id: "1", type: "credit_sale", amount: 100000 },
      { id: "2", type: "receipt", amount: 40000 },
    ];

    expect(calculatePartyBalance(0, transactions)).toBe(60000);

    // Delete receipt transaction
    transactions = transactions.filter((t) => t.id !== "2");

    expect(calculatePartyBalance(0, transactions)).toBe(100000);
  });
});
