import { F } from "./text/fees";

/** The shape behind /fees, shared by the fee list and the fee detail. */

export interface Receipt {
  id: string;
  receiptNo: string;
  amount: number;
  mode: string;
  date: string;
  instalments: string;
  heads: { key: string; amount: number }[];
  ref: string | null;
}
export interface Claim {
  id: string;
  amount: number;
  utr: string;
  paidOn: string;
  status: "pending" | "verified" | "rejected";
  rejectReason: string | null;
}
export interface Instalment {
  name: string;
  due: string;
  amount: number;
  paid: number;
  outstanding: number;
  overdue: boolean;
  fine: number;
  /** Fee heads that make up the amount; a concession is a negative head. Older servers send none. */
  heads?: { key: string; amount: number }[];
  paidOn?: string | null;
}
export interface Pay {
  upiId: string | null;
  upiName: string;
  officePhone: string;
}
export type Fees =
  | { asOf: string; available: false; pay: Pay; receipts: Receipt[]; claims: Claim[] }
  | {
      asOf: string;
      available: true;
      pay: Pay;
      session: { total: number; paid: number; balance: number };
      dueNow: number;
      fine: number;
      options: { dueNow: number; full: number };
      instalments: Instalment[];
      receipts: Receipt[];
      claims: Claim[];
    };

export type InsState = "paid" | "overdue" | "part" | "upcoming";
export const insState = (i: Instalment): InsState => (i.outstanding <= 0 ? "paid" : i.overdue ? "overdue" : i.paid > 0 ? "part" : "upcoming");

export const INS_TONE: Record<InsState, "ok" | "bad" | "wait" | "mute"> = { paid: "ok", overdue: "bad", part: "wait", upcoming: "mute" };
export const INS_TEXT = { paid: F.insPaid, overdue: F.insOverdue, part: F.insPart, upcoming: F.insUpcoming } as const;
