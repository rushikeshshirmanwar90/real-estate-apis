// Excel material import (super-admin): validation and planning.
//
// Pure functions only — no database access — so the rules are easy to test.
// The route loads the project/sections, calls planImport(), and writes the result.
//
// Rules (they mirror how the app records materials):
// - Each Purchases row becomes its own MaterialAvailable entry; project.spent grows by its cost.
// - Usage rows consume quantity from purchases in the SAME file, oldest row first, and
//   become MaterialUsed entries priced at the batch they came from.
// - A purchase that is fully used is not added to MaterialAvailable (the app removes
//   stock rows that reach 0 too); its cost still counts toward spent.

export const MAX_ROWS_PER_SHEET = 2000;

export type SheetName = "Purchases" | "Usage";

export interface RawPurchaseRow {
  row: number; // Excel row number, for error messages
  material?: unknown;
  unit?: unknown;
  specs?: unknown;
  quantity?: unknown;
  rate?: unknown;
  vendor?: unknown;
  billDate?: unknown;
  amountPaid?: unknown;
}

export interface RawUsageRow {
  row: number;
  material?: unknown;
  unit?: unknown;
  specs?: unknown;
  quantity?: unknown;
  section?: unknown;
  miniSection?: unknown;
  date?: unknown;
}

export interface SectionInfo {
  sectionId: string;
  name: string;
  type?: string;
}

export interface MiniSectionInfo {
  id: string;
  name: string;
  sectionId: string;
}

export interface ImportError {
  sheet: SheetName;
  row: number;
  message: string;
}

export type Specs = Record<string, string>;

export interface PlannedAvailable {
  name: string;
  unit: string;
  specs: Specs;
  qnt: number; // quantity left after usage
  perUnitCost: number;
  totalCost: number; // cost of the whole purchase, as in the app
  contractor_name?: string;
  paymentStatus?: "full" | "partial" | "unpaid";
  amountPaid?: number;
  billingDate?: Date;
  addedAt: Date;
}

export interface PlannedPurchase extends Omit<PlannedAvailable, "qnt"> {
  row: number;
  qnt: number; // quantity bought
  remaining: number;
}

export interface PlannedUsed {
  name: string;
  unit: string;
  specs: Specs;
  qnt: number;
  perUnitCost: number;
  totalCost: number;
  sectionId: string;
  sectionName: string;
  miniSectionId?: string;
  miniSectionName?: string;
  addedAt: Date;
}

export interface ImportSummary {
  purchaseRows: number;
  usageRows: number;
  materials: number; // distinct materials bought
  totalPurchaseCost: number;
  totalUsedCost: number;
  remainingStockRows: number;
}

export interface ImportPlan {
  errors: ImportError[];
  summary: ImportSummary;
  purchases: PlannedPurchase[];
  available: PlannedAvailable[];
  used: PlannedUsed[];
}

// ---------------------------------------------------------------------------
// Cell parsing
// ---------------------------------------------------------------------------

export const text = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "text" in (value as any)) {
    return String((value as any).text ?? "").trim(); // exceljs rich text / hyperlink cells
  }
  return String(value).trim();
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Numbers like 1200, "1,200.50", "₹ 450" → number; blank → null; anything else → NaN. */
export const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const cleaned = text(value).replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Dates from Excel: Date cells, Excel serial numbers, ISO strings,
 * or day-first text like 15/03/2025 or 15-03-2025. Blank → null; unreadable → "invalid".
 */
export const parseDate = (value: unknown): Date | null | "invalid" => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? "invalid" : value;
  if (typeof value === "number") {
    if (value < 1 || value > 100000) return "invalid";
    // Excel serial date (days since 1899-12-30)
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  const s = text(value);
  if (!s) return null;
  const dayFirst = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    return date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d) ? date : "invalid";
  }
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? "invalid" : iso;
};

const camelKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));

/** "Brand: UltraTech, Grade: 53" → { brand: "UltraTech", grade: "53" }. Text without ":" → { details }. */
export const parseSpecs = (value: unknown): Specs => {
  const s = text(value);
  if (!s) return {};
  const specs: Specs = {};
  const loose: string[] = [];
  for (const part of s.split(/[,;\n]/)) {
    const piece = part.trim();
    if (!piece) continue;
    const sep = piece.search(/[:=]/);
    if (sep > 0) {
      const key = camelKey(piece.slice(0, sep));
      const val = piece.slice(sep + 1).trim();
      if (key && val) specs[key] = val;
    } else {
      loose.push(piece);
    }
  }
  if (loose.length) specs.details = loose.join(", ");
  return specs;
};

/** Identity used to match Usage rows to Purchases rows: name + unit + specs, ignoring case. */
export const materialKey = (name: string, unit: string, specs: Specs) =>
  JSON.stringify([
    name.trim().toLowerCase(),
    unit.trim().toLowerCase(),
    Object.keys(specs)
      .sort()
      .map((k) => [k, String(specs[k]).trim().toLowerCase()]),
  ]);

const isBlankRow = (row: Record<string, unknown>) =>
  Object.entries(row).every(([k, v]) => k === "row" || text(v) === "");

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export const planImport = (input: {
  purchases: RawPurchaseRow[];
  usages: RawUsageRow[];
  sections: SectionInfo[];
  miniSections: MiniSectionInfo[];
  now?: Date;
}): ImportPlan => {
  const now = input.now ?? new Date();
  const errors: ImportError[] = [];
  const err = (sheet: SheetName, row: number, message: string) => errors.push({ sheet, row, message });

  const purchaseRows = (input.purchases ?? []).filter((r) => r && !isBlankRow(r as any));
  const usageRows = (input.usages ?? []).filter((r) => r && !isBlankRow(r as any));

  if (purchaseRows.length > MAX_ROWS_PER_SHEET) {
    err("Purchases", 0, `Too many rows (${purchaseRows.length}). Split the file: at most ${MAX_ROWS_PER_SHEET} per sheet.`);
  }
  if (usageRows.length > MAX_ROWS_PER_SHEET) {
    err("Usage", 0, `Too many rows (${usageRows.length}). Split the file: at most ${MAX_ROWS_PER_SHEET} per sheet.`);
  }
  if (purchaseRows.length === 0) {
    err("Purchases", 0, "The Purchases sheet has no rows. Add at least one material that was bought.");
  }
  if (errors.length) return emptyPlan(errors, purchaseRows.length, usageRows.length);

  // --- Purchases
  const purchases: PlannedPurchase[] = [];
  const pools = new Map<string, PlannedPurchase[]>(); // material key → purchase rows, file order

  for (const r of purchaseRows) {
    const name = text(r.material);
    const unit = text(r.unit);
    const specs = parseSpecs(r.specs);
    const qnt = parseNumber(r.quantity);
    const rate = parseNumber(r.rate);
    const paid = parseNumber(r.amountPaid);
    const billDate = parseDate(r.billDate);
    const before = errors.length;

    if (!name) err("Purchases", r.row, "Material name is missing.");
    if (!unit) err("Purchases", r.row, "Unit is missing (for example: bags, kg, pieces).");
    if (qnt === null) err("Purchases", r.row, "Quantity is missing.");
    else if (Number.isNaN(qnt) || qnt <= 0) err("Purchases", r.row, "Quantity must be a number greater than 0.");
    if (rate === null) err("Purchases", r.row, "Rate per unit is missing.");
    else if (Number.isNaN(rate) || rate < 0) err("Purchases", r.row, "Rate per unit must be a number of 0 or more.");
    if (billDate === "invalid") err("Purchases", r.row, "Bill date isn't a date. Use DD/MM/YYYY.");
    if (paid !== null && (Number.isNaN(paid) || paid < 0)) {
      err("Purchases", r.row, "Amount paid must be a number of 0 or more.");
    }
    if (errors.length > before) continue;

    const totalCost = round2((qnt as number) * (rate as number));
    if (paid !== null && paid > totalCost + 0.01) {
      err("Purchases", r.row, `Amount paid (${paid}) is more than the total cost (${totalCost}).`);
      continue;
    }

    const vendor = text(r.vendor);
    const purchase: PlannedPurchase = {
      row: r.row,
      name,
      unit,
      specs,
      qnt: qnt as number,
      remaining: qnt as number,
      perUnitCost: rate as number,
      totalCost,
      ...(vendor ? { contractor_name: vendor } : {}),
      ...(paid !== null
        ? {
            amountPaid: round2(paid),
            paymentStatus: paid >= totalCost - 0.01 ? "full" : paid > 0 ? "partial" : "unpaid",
          }
        : {}),
      ...(billDate instanceof Date ? { billingDate: billDate } : {}),
      addedAt: billDate instanceof Date ? billDate : now,
    };
    purchases.push(purchase);
    const key = materialKey(name, unit, specs);
    pools.set(key, [...(pools.get(key) ?? []), purchase]);
  }

  // --- Usage
  const sectionsByName = new Map<string, SectionInfo>();
  for (const s of input.sections ?? []) sectionsByName.set(norm(s.name), s);

  const used: PlannedUsed[] = [];
  for (const r of usageRows) {
    const name = text(r.material);
    const unit = text(r.unit);
    const specs = parseSpecs(r.specs);
    const qnt = parseNumber(r.quantity);
    const sectionName = text(r.section);
    const miniName = text(r.miniSection);
    const date = parseDate(r.date);
    const before = errors.length;

    if (!name) err("Usage", r.row, "Material name is missing.");
    if (!unit) err("Usage", r.row, "Unit is missing.");
    if (qnt === null) err("Usage", r.row, "Quantity used is missing.");
    else if (Number.isNaN(qnt) || qnt <= 0) err("Usage", r.row, "Quantity used must be a number greater than 0.");
    if (date === "invalid") err("Usage", r.row, "Date used isn't a date. Use DD/MM/YYYY.");

    let section: SectionInfo | undefined;
    if (!sectionName) {
      err("Usage", r.row, "Section is missing. Pick one from the list.");
    } else {
      section = sectionsByName.get(norm(sectionName));
      if (!section) err("Usage", r.row, `Section "${sectionName}" doesn't exist in this project.`);
    }

    let mini: MiniSectionInfo | undefined;
    if (miniName && section) {
      mini = (input.miniSections ?? []).find(
        (m) => m.sectionId === section!.sectionId && norm(m.name) === norm(miniName)
      );
      if (!mini) err("Usage", r.row, `Mini-section "${miniName}" doesn't exist in section "${section.name}".`);
    }
    if (errors.length > before) continue;

    const pool = pools.get(materialKey(name, unit, specs));
    if (!pool) {
      err(
        "Usage",
        r.row,
        `"${name}" (${unit}${Object.keys(specs).length ? `, ${text(r.specs)}` : ""}) isn't on the Purchases sheet. Material, unit and specs must match a purchase row.`
      );
      continue;
    }
    const left = pool.reduce((sum, p) => sum + p.remaining, 0);
    if ((qnt as number) > left + 1e-9) {
      err("Usage", r.row, `Uses ${qnt} ${unit} of "${name}" but only ${round2(left)} is left from the Purchases sheet.`);
      continue;
    }

    // Take from the oldest purchase rows first, priced at each batch's rate
    let need = qnt as number;
    for (const p of pool) {
      if (need <= 1e-9) break;
      const take = Math.min(need, p.remaining);
      if (take <= 0) continue;
      p.remaining = round2(p.remaining - take);
      need = round2(need - take);
      used.push({
        name: p.name,
        unit: p.unit,
        specs: p.specs,
        qnt: take,
        perUnitCost: p.perUnitCost,
        totalCost: round2(take * p.perUnitCost),
        sectionId: section!.sectionId,
        sectionName: section!.name,
        ...(mini ? { miniSectionId: mini.id, miniSectionName: mini.name } : {}),
        addedAt: date instanceof Date ? date : now,
      });
    }
  }

  const available: PlannedAvailable[] = purchases
    .filter((p) => p.remaining > 1e-9)
    .map(({ row: _row, remaining, qnt: _bought, ...rest }) => ({ ...rest, qnt: remaining }));

  return {
    errors,
    summary: {
      purchaseRows: purchaseRows.length,
      usageRows: usageRows.length,
      materials: pools.size,
      totalPurchaseCost: round2(purchases.reduce((s, p) => s + p.totalCost, 0)),
      totalUsedCost: round2(used.reduce((s, u) => s + u.totalCost, 0)),
      remainingStockRows: available.length,
    },
    purchases,
    available,
    used,
  };
};

const emptyPlan = (errors: ImportError[], purchaseRows: number, usageRows: number): ImportPlan => ({
  errors,
  summary: {
    purchaseRows,
    usageRows,
    materials: 0,
    totalPurchaseCost: 0,
    totalUsedCost: 0,
    remainingStockRows: 0,
  },
  purchases: [],
  available: [],
  used: [],
});
