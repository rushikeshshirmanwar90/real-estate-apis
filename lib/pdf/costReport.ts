// Cost Summary reports (materials, equipment, other costs, contractors) as
// printable HTML. The xsite app posts the rows it shows on the Cost Summary
// screen; this checks them and lays out the report that renderPdf() prints.

export type CostReportType = "material" | "equipment" | "other" | "contractor";

export const COST_REPORT_TYPES: CostReportType[] = ["material", "equipment", "other", "contractor"];

/** The request can't be turned into a report; the message says why. */
export class CostReportRequestError extends Error {}

/** The most rows one report prints. */
export const MAX_REPORT_ROWS = 2000;

interface MaterialRow {
  name: string;
  unit: string;
  specs: [string, string][];
  totalImported: number;
  totalUsed: number;
  currentlyAvailable: number;
  perUnitCost: number;
  totalCost: number;
  vendors: string[];
}

interface EquipmentRow {
  type: string;
  category: string;
  quantity: number;
  perUnitCost: number;
  totalCost: number;
  costType: string;
  rentalPeriod: string;
  rentalDuration: number;
  brand: string;
  model: string;
  capacity: string;
  fuelType: string;
  operatorRequired: boolean;
  notes: string;
  date: string;
}

interface OtherCostRow {
  title: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

interface ContractorPayment {
  amount: number;
  paymentDate: string;
  paymentType: string;
  notes: string;
}

interface ContractorRow {
  name: string;
  contractType: string;
  totalAmount: number;
  totalPaid: number;
  payments: ContractorPayment[];
}

interface ReportBase {
  projectName: string;
  generatedBy: string;
  clientId: string;
}

export type CostReport =
  | (ReportBase & { type: "material"; rows: MaterialRow[] })
  | (ReportBase & { type: "equipment"; rows: EquipmentRow[] })
  | (ReportBase & { type: "other"; rows: OtherCostRow[] })
  | (ReportBase & { type: "contractor"; rows: ContractorRow[] });

// ─── Parsing ────────────────────────────────────────────────────────────────

type Loose = Record<string, unknown>;

const text = (value: unknown, max = 300): string =>
  typeof value === "string" ? value.trim().slice(0, max) : typeof value === "number" ? String(value) : "";

const amount = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const record = (value: unknown): Loose =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : {};

const list = (value: unknown, max: number): unknown[] => (Array.isArray(value) ? value.slice(0, max) : []);

const parseMaterial = (raw: unknown): MaterialRow => {
  const r = record(raw);
  const specs = Object.entries(record(r.specs))
    .map(([key, value]): [string, string] => [text(key, 60), text(value, 120)])
    .filter(([key, value]) => key && value)
    .slice(0, 20);
  return {
    name: text(r.name) || "Material",
    unit: text(r.unit, 40),
    specs,
    totalImported: amount(r.totalImported),
    totalUsed: amount(r.totalUsed),
    currentlyAvailable: amount(r.currentlyAvailable),
    perUnitCost: amount(r.perUnitCost),
    totalCost: amount(r.totalCost),
    vendors: list(r.vendors, 30).map((v) => text(v, 120)).filter(Boolean),
  };
};

const parseEquipment = (raw: unknown): EquipmentRow => {
  const r = record(raw);
  const specs = record(r.specifications);
  return {
    type: text(r.type) || "Equipment",
    category: text(r.category, 120),
    quantity: amount(r.quantity),
    perUnitCost: amount(r.perUnitCost),
    totalCost: amount(r.totalCost),
    costType: text(r.costType, 40),
    rentalPeriod: text(r.rentalPeriod, 40),
    rentalDuration: amount(r.rentalDuration),
    brand: text(specs.brand, 120),
    model: text(specs.model, 120),
    capacity: text(specs.capacity, 120),
    fuelType: text(specs.fuelType, 40),
    operatorRequired: specs.operatorRequired === true,
    notes: text(r.notes, 1000),
    date: text(r.createdAt ?? r.usageDate, 40),
  };
};

const parseOtherCost = (raw: unknown): OtherCostRow => {
  const r = record(raw);
  return {
    title: text(r.title) || text(r.name) || "Other Cost",
    category: text(r.category, 120),
    description: text(r.description, 1000),
    amount: amount(r.amount),
    date: text(r.addedAt ?? r.createdAt, 40),
  };
};

const parseContractor = (raw: unknown): ContractorRow => {
  const r = record(raw);
  return {
    name: text(r.name) || "Contractor",
    contractType: text(r.contractType, 120),
    totalAmount: amount(r.totalAmount),
    totalPaid: amount(r.totalPaid),
    payments: list(r.payments, MAX_REPORT_ROWS).map((p) => {
      const payment = record(p);
      return {
        amount: amount(payment.amount),
        paymentDate: text(payment.paymentDate, 40),
        paymentType: text(payment.paymentType, 40),
        notes: text(payment.notes, 500),
      };
    }),
  };
};

/** Checks a report request and keeps only what the report prints. */
export function parseCostReport(body: unknown): CostReport {
  const b = record(body);
  const type = b.type as CostReportType;
  if (!COST_REPORT_TYPES.includes(type)) {
    throw new CostReportRequestError(`type must be one of: ${COST_REPORT_TYPES.join(", ")}`);
  }
  if (!Array.isArray(b.rows) || b.rows.length === 0) {
    throw new CostReportRequestError("There's nothing to put in this report yet.");
  }
  if (b.rows.length > MAX_REPORT_ROWS) {
    throw new CostReportRequestError(`A report can have up to ${MAX_REPORT_ROWS} rows; this one has ${b.rows.length}.`);
  }

  const base: ReportBase = {
    projectName: text(b.projectName, 120) || "Project",
    generatedBy: text(b.generatedBy, 120) || "Admin",
    clientId: text(b.clientId, 40),
  };
  switch (type) {
    case "material":
      return { ...base, type, rows: b.rows.map(parseMaterial) };
    case "equipment":
      return { ...base, type, rows: b.rows.map(parseEquipment) };
    case "other":
      return { ...base, type, rows: b.rows.map(parseOtherCost) };
    case "contractor":
      return { ...base, type, rows: b.rows.map(parseContractor) };
  }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

// Reports are read in India, wherever the server's clock is set.
const TIME_ZONE = "Asia/Kolkata";

const esc = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const inr = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Whole rupees, for the large key figures. */
const inrWhole = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

const qty = (n: number) => (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const pct = (part: number, whole: number) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0);

const shortDate = (value: string) => {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE })
    : "—";
};

const generatedAt = () =>
  new Date().toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE,
  });

/** "Material_Stock_Report_Lotus_plaza_2026-10-29.pdf" */
export function costReportFileName(report: CostReport): string {
  const slug = report.projectName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Project";
  const day = new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD
  return `${KINDS[report.type].fileLabel}_${slug}_${day}.pdf`;
}

/** The running footer on every page: what this document is, and where you are in it. */
export function costReportFooter(report: CostReport, companyName: string): string {
  return pageFooter(`${companyName} · ${report.projectName} · ${KINDS[report.type].label}`);
}

/** A page footer for headless Chrome's footerTemplate (it can't use the page's CSS). */
export function pageFooter(left: string): string {
  return `<div style="width:100%;padding:0 14mm;font-family:'Noto Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
    font-size:7.5pt;color:#64748B;display:flex;justify-content:space-between;align-items:center;
    -webkit-print-color-adjust:exact">
    <span>${esc(left)}</span>
    <span>Xsite · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
}

// ─── Design tokens ──────────────────────────────────────────────────────────
//
// One shade per cost category, the same ones the app's Cost Summary uses, so a
// report reads as the screen it came from. Shades mark things (the accent
// bar, row bars); text stays ink. Green only ever means paid, amber only used.
//
//   ink      #0F172A  titles, figures       17.9:1 on white
//   body     #334155  table text            10.4:1
//   muted    #64748B  labels, units          4.8:1  (smallest text is 8 pt)
//   hairline #E2E8F0  rules
//   paid     #047857  money paid             5.5:1
//   used     #B45309  stock used             5.0:1
//   over     #B91C1C  paid over contract     6.5:1

interface Kind {
  label: string;
  fileLabel: string;
  shade: string;
}

const KINDS: Record<CostReportType, Kind> = {
  material: { label: "Material Stock Report", fileLabel: "Material_Stock_Report", shade: "#173F69" },
  contractor: { label: "Contractor Report", fileLabel: "Project_Contractor_Report", shade: "#2B5F95" },
  equipment: { label: "Equipment Cost Report", fileLabel: "Equipment_Cost_Report", shade: "#3A78B5" },
  other: { label: "Other Cost Report", fileLabel: "Other_Cost_Report", shade: "#4F8BC7" },
};

const css = (shade: string) => `
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: 'Noto Sans', -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
         font-size: 9.5pt; line-height: 1.45; color: #334155; background: #fff; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }

  /* Header: the project first, the company and date on the trailing side */
  .accent { width: 34mm; height: 4pt; border-radius: 2pt; background: ${shade}; margin-bottom: 10pt; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16pt;
          padding-bottom: 12pt; border-bottom: 1pt solid #E2E8F0; }
  .eyebrow { font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #64748B; }
  .title { font-size: 22pt; font-weight: 700; color: #0F172A; letter-spacing: -.02em; line-height: 1.15; margin-top: 3pt; }
  .issuer { text-align: right; font-size: 8.5pt; color: #64748B; line-height: 1.5; }
  .issuer strong { display: block; font-size: 10.5pt; color: #0F172A; font-weight: 600; }

  /* Key figures: the answer before the detail */
  .figures { display: flex; margin: 14pt 0 18pt; border: 1pt solid #E2E8F0; border-radius: 8pt; }
  .figure { flex: 1; padding: 10pt 14pt; }
  .figure + .figure { border-left: 1pt solid #E2E8F0; }
  .figure .label { font-size: 8pt; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: .06em; }
  .figure .value { font-size: 17pt; font-weight: 700; color: #0F172A; margin-top: 2pt; letter-spacing: -.01em; }
  .figure .note { font-size: 8.5pt; color: #64748B; margin-top: 1pt; }
  .figure.lead .value { font-size: 20pt; }

  .section { display: flex; justify-content: space-between; align-items: baseline; margin: 0 0 6pt; }
  .section h2 { margin: 0; font-size: 11pt; font-weight: 700; color: #0F172A; }
  .section span { font-size: 8.5pt; color: #64748B; }

  /* Ledger tables: hairlines only, money right-aligned in tabular figures */
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { font-size: 8pt; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: .05em;
       text-align: left; padding: 0 6pt 6pt; border-bottom: 1pt solid #CBD5E1; }
  td { padding: 7pt 6pt; border-bottom: .75pt solid #E2E8F0; vertical-align: top; }
  th:first-child, td:first-child { padding-left: 0; }
  th:last-child, td:last-child { padding-right: 0; }
  .r { text-align: right; } .c { text-align: center; }
  .idx { width: 18pt; color: #64748B; font-size: 8.5pt; }
  .name { font-weight: 600; color: #0F172A; }
  .sub { font-size: 8.5pt; color: #64748B; margin-top: 1pt; }
  .unit { font-size: 8pt; color: #64748B; margin-left: 2pt; }
  .amount { font-weight: 600; color: #0F172A; }
  .paid { color: #047857; } .used { color: #B45309; } .over { color: #B91C1C; }
  .tag { display: inline-block; font-size: 8pt; font-weight: 600; color: #334155; background: #F1F5F9;
         border-radius: 4pt; padding: 1pt 5pt; white-space: nowrap; }
  tr.total td { border-bottom: none; border-top: 1.5pt solid #0F172A; padding-top: 8pt;
                font-weight: 700; color: #0F172A; }

  /* The row bar: each row's share, in the category's shade */
  .bar { height: 3pt; border-radius: 1.5pt; background: #EEF2F7; margin-top: 4pt; overflow: hidden; }
  .bar i { display: block; height: 100%; border-radius: 1.5pt; background: ${shade}; }

  /* Contractors */
  .contract { border: 1pt solid #E2E8F0; border-radius: 8pt; padding: 12pt 14pt 4pt; margin-bottom: 12pt; }
  .contract-head, .contract-progress, .contract-figures { break-after: avoid; }
  .contract-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
  .contract-head .name { font-size: 11.5pt; }
  .contract-progress { display: flex; align-items: center; gap: 8pt; margin: 8pt 0 10pt; }
  .contract-progress .bar { flex: 1; height: 5pt; margin: 0; }
  .contract-progress .bar i { background: #047857; }
  .contract-progress span { font-size: 8.5pt; color: #64748B; white-space: nowrap; }
  .contract-figures { display: flex; gap: 22pt; margin-bottom: 10pt; }
  .contract-figures .label { font-size: 8pt; color: #64748B; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
  .contract-figures .value { font-size: 11pt; font-weight: 700; color: #0F172A; }
  .contract-figures .value.paid { color: #047857; } .contract-figures .value.over { color: #B91C1C; }
  .empty { padding: 4pt 0 10pt; color: #64748B; font-size: 9pt; }
`;

interface Figure {
  label: string;
  value: string;
  note?: string;
}

const figures = (items: Figure[]) =>
  `<div class="figures">${items
    .map(
      (f, i) => `<div class="figure${i === 0 ? " lead" : ""}">
        <div class="label">${esc(f.label)}</div>
        <div class="value num">${f.value}</div>
        ${f.note ? `<div class="note">${esc(f.note)}</div>` : ""}
      </div>`,
    )
    .join("")}</div>`;

const rowBar = (percent: number) => `<div class="bar"><i style="width:${percent.toFixed(1)}%"></i></div>`;

function page(report: CostReport, companyName: string, body: string): string {
  const kind = KINDS[report.type];
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(kind.label)} - ${esc(report.projectName)}</title><style>${css(kind.shade)}</style></head><body>
  <div class="accent"></div>
  <div class="head">
    <div><div class="eyebrow">${esc(kind.label)}</div><div class="title">${esc(report.projectName)}</div></div>
    <div class="issuer"><strong>${esc(companyName)}</strong>Generated ${esc(generatedAt())}<br>by ${esc(report.generatedBy)}</div>
  </div>
  ${body}
</body></html>`;
}

// ─── Reports ────────────────────────────────────────────────────────────────

function materialBody(rows: MaterialRow[]): string {
  const specsOf = (m: MaterialRow) => m.specs.map(([k, v]) => `${k}: ${v}`).join(" · ");
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name) || specsOf(a).localeCompare(specsOf(b)));
  const total = sorted.reduce((sum, m) => sum + m.totalCost, 0);
  const inStock = sorted.filter((m) => m.currentlyAvailable > 0).length;
  const unit = (m: MaterialRow) => (m.unit ? `<span class="unit">${esc(m.unit)}</span>` : "");

  const trs = sorted
    .map((m, i) => `<tr>
      <td class="idx num">${i + 1}</td>
      <td><div class="name">${esc(m.name)}</div>
        ${m.specs.length ? `<div class="sub">${esc(specsOf(m))}</div>` : ""}
        ${m.vendors.length ? `<div class="sub">From ${esc(m.vendors.join(", "))}</div>` : ""}</td>
      <td class="r num">${qty(m.totalImported)}${unit(m)}<div class="sub">@ ${inr(m.perUnitCost)}</div></td>
      <td class="r num amount">${inr(m.totalCost)}</td>
      <td class="r num used">${qty(m.totalUsed)}</td>
      <td class="r num" style="width:74pt">${qty(m.currentlyAvailable)}${unit(m)}${rowBar(pct(m.currentlyAvailable, m.totalImported))}</td>
    </tr>`)
    .join("");

  return figures([
    { label: "Purchase value", value: inrWhole(total) },
    { label: "Materials", value: String(sorted.length), note: "grouped by name, unit and specs" },
    { label: "Still in stock", value: `${inStock} of ${sorted.length}`, note: `${sorted.length - inStock} fully used` },
  ]) + `<div class="section"><h2>Stock</h2><span>Bar shows how much of each purchase is left</span></div>
    <table>
      <thead><tr><th>#</th><th>Material</th><th class="r">Bought</th><th class="r">Cost</th><th class="r">Used</th><th class="r">Left</th></tr></thead>
      <tbody>${trs}
        <tr class="total"><td></td><td>Total</td><td></td><td class="r num">${inr(total)}</td><td></td><td></td></tr>
      </tbody></table>`;
}

// The app writes this note on every entry; it says nothing a reader needs.
const AUTO_NOTE = /^added \d+ equipment entr(y|ies)$/i;

function equipmentBody(rows: EquipmentRow[]): string {
  const total = rows.reduce((sum, e) => sum + e.totalCost, 0);
  const units = rows.reduce((sum, e) => sum + e.quantity, 0);
  const rentals = rows.filter((e) => e.costType === "rental").length;
  const PERIOD: Record<string, string> = { hourly: "hour", daily: "day", weekly: "week", monthly: "month" };
  const costType = (e: EquipmentRow) =>
    e.costType === "rental" && e.rentalPeriod && e.rentalDuration
      ? `Rental · ${e.rentalDuration} ${PERIOD[e.rentalPeriod] ?? e.rentalPeriod}${e.rentalDuration === 1 ? "" : "s"}`
      : e.costType ? e.costType[0].toUpperCase() + e.costType.slice(1) : "Purchase";
  const specs = (e: EquipmentRow) =>
    [e.brand, e.model, e.capacity, e.fuelType, e.operatorRequired && "operator required"].filter(Boolean).join(" · ");

  const trs = rows
    .map((e, i) => `<tr>
      <td class="idx num">${i + 1}</td>
      <td><div class="name">${esc(e.type)}</div>
        ${e.category || specs(e) ? `<div class="sub">${esc([e.category, specs(e)].filter(Boolean).join(" · "))}</div>` : ""}
        ${e.notes && !AUTO_NOTE.test(e.notes) ? `<div class="sub">${esc(e.notes)}</div>` : ""}</td>
      <td><span class="tag">${esc(costType(e))}</span></td>
      <td class="num">${shortDate(e.date)}</td>
      <td class="r num">${qty(e.quantity)}<div class="sub">@ ${inr(e.perUnitCost)}</div></td>
      <td class="r num amount" style="width:84pt">${inr(e.totalCost)}${rowBar(pct(e.totalCost, total))}</td>
    </tr>`)
    .join("");

  return figures([
    { label: "Total cost", value: inrWhole(total) },
    { label: "Entries", value: String(rows.length), note: `${qty(units)} units in all` },
    { label: "Rentals", value: `${rentals} of ${rows.length}`, note: `${rows.length - rentals} bought or leased` },
  ]) + `<div class="section"><h2>Equipment</h2><span>Bar shows each entry's share of the total</span></div>
    <table>
      <thead><tr><th>#</th><th>Equipment</th><th>Type</th><th>Date</th><th class="r">Qty</th><th class="r">Cost</th></tr></thead>
      <tbody>${trs}
        <tr class="total"><td></td><td>Total</td><td></td><td></td><td class="r num">${qty(units)}</td><td class="r num">${inr(total)}</td></tr>
      </tbody></table>`;
}

function otherCostBody(rows: OtherCostRow[]): string {
  const total = rows.reduce((sum, o) => sum + o.amount, 0);
  const largest = rows.reduce<OtherCostRow | null>((top, o) => (!top || o.amount > top.amount ? o : top), null);
  const sorted = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasCategory = rows.some((o) => o.category);
  const trs = sorted
    .map((o, i) => `<tr>
      <td class="idx num">${i + 1}</td>
      <td><div class="name">${esc(o.title)}</div>
        ${o.description && o.description.toLowerCase() !== o.title.toLowerCase() ? `<div class="sub">${esc(o.description)}</div>` : ""}</td>
      ${hasCategory ? `<td>${o.category ? `<span class="tag">${esc(o.category)}</span>` : `<span class="sub">—</span>`}</td>` : ""}
      <td class="num">${shortDate(o.date)}</td>
      <td class="r num amount" style="width:84pt">${inr(o.amount)}${rowBar(pct(o.amount, total))}</td>
    </tr>`)
    .join("");

  return figures([
    { label: "Total spent", value: inrWhole(total) },
    { label: "Expenses", value: String(rows.length) },
    largest
      ? { label: "Largest", value: inrWhole(largest.amount), note: largest.title }
      : { label: "Largest", value: "—" },
  ]) + `<div class="section"><h2>Expenses</h2><span>Oldest first · bar shows each expense's share</span></div>
    <table>
      <thead><tr><th>#</th><th>Expense</th>${hasCategory ? "<th>Category</th>" : ""}<th>Date</th><th class="r">Amount</th></tr></thead>
      <tbody>${trs}
        <tr class="total"><td></td><td>Total</td>${hasCategory ? "<td></td>" : ""}<td></td><td class="r num">${inr(total)}</td></tr>
      </tbody></table>`;
}

const PAYMENT_LABELS: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", advance: "Advance", final: "Final",
};

function contractorBody(rows: ContractorRow[]): string {
  const contractTotal = rows.reduce((sum, c) => sum + c.totalAmount, 0);
  const paidTotal = rows.reduce((sum, c) => sum + c.totalPaid, 0);
  const remainingTotal = contractTotal - paidTotal;

  const cards = rows
    .map((c) => {
      const remaining = c.totalAmount - c.totalPaid;
      const paidPct = pct(c.totalPaid, c.totalAmount);
      const payments = [...c.payments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
      const table = payments.length
        ? `<table><thead><tr><th>Date</th><th>Type</th><th>Note</th><th class="r">Amount</th></tr></thead><tbody>
            ${payments.map((p) => `<tr>
              <td class="num" style="width:70pt">${shortDate(p.paymentDate)}</td>
              <td style="width:62pt"><span class="tag">${esc(PAYMENT_LABELS[p.paymentType] ?? (p.paymentType || "Payment"))}</span></td>
              <td>${p.notes ? esc(p.notes) : '<span class="sub">—</span>'}</td>
              <td class="r num amount paid" style="width:80pt">${inr(p.amount)}</td></tr>`).join("")}
          </tbody></table>`
        : `<div class="empty">No payments recorded yet.</div>`;
      return `<div class="contract">
        <div class="contract-head">
          <div><span class="name">${esc(c.name)}</span>${c.contractType ? `<span class="sub"> · ${esc(c.contractType)}</span>` : ""}</div>
          <div class="sub">${payments.length} payment${payments.length === 1 ? "" : "s"}</div>
        </div>
        <div class="contract-progress">${rowBar(paidPct)}<span>${Math.round(paidPct)}% paid</span></div>
        <div class="contract-figures">
          <div><div class="label">Contract</div><div class="value num">${inr(c.totalAmount)}</div></div>
          <div><div class="label">Paid</div><div class="value num paid">${inr(c.totalPaid)}</div></div>
          <div><div class="label">${remaining < 0 ? "Paid over contract" : "Remaining"}</div>
            <div class="value num${remaining < 0 ? " over" : remaining === 0 ? " paid" : ""}">${remaining === 0 && c.totalAmount > 0 ? "Paid in full" : inr(Math.abs(remaining))}</div></div>
        </div>
        ${table}
      </div>`;
    })
    .join("");

  return figures([
    { label: "Contract total", value: inrWhole(contractTotal), note: `${rows.length} contract${rows.length === 1 ? "" : "s"}` },
    { label: "Paid", value: inrWhole(paidTotal), note: `${Math.round(pct(paidTotal, contractTotal))}% of the total` },
    { label: remainingTotal < 0 ? "Paid over" : "Remaining", value: inrWhole(Math.abs(remainingTotal)) },
  ]) + `<div class="section"><h2>Contracts</h2><span>Bar shows how much of each contract is paid</span></div>${cards}`;
}

/** The report as a printable A4 page. */
export function costReportHtml(report: CostReport, companyName: string): string {
  const body =
    report.type === "material"
      ? materialBody(report.rows)
      : report.type === "equipment"
        ? equipmentBody(report.rows)
        : report.type === "other"
          ? otherCostBody(report.rows)
          : contractorBody(report.rows);
  return page(report, companyName, body);
}
