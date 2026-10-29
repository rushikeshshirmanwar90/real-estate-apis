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

const qty = (n: number) => (n || 0).toLocaleString("en-IN");

const shortDate = (value: string) => {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE })
    : "—";
};

const longDate = (value: string) => {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: TIME_ZONE })
    : "Date not recorded";
};

/** "Material_Stock_Report_Lotus_plaza_2026-10-29.pdf" */
export function costReportFileName(report: CostReport): string {
  const slug = report.projectName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Project";
  const day = new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD
  return `${THEMES[report.type].fileLabel}_${slug}_${day}.pdf`;
}

// ─── Layout ─────────────────────────────────────────────────────────────────

interface Theme {
  label: string;
  fileLabel: string;
  heading: string;
  banner: string;
  stripBg: string;
  stripBorder: string;
  tableHead: string;
  accent: string;
  totalLine: string;
  totalInk: string;
  totalBg: string;
}

const THEMES: Record<CostReportType, Theme> = {
  material: {
    label: "Material Stock Report",
    fileLabel: "Material_Stock_Report",
    heading: "📦 Current Material Stock",
    banner: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c81 100%)",
    stripBg: "#f0f9ff",
    stripBorder: "#bae6fd",
    tableHead: "linear-gradient(90deg, #1e293b, #334155)",
    accent: "#059669",
    totalLine: "#10b981",
    totalInk: "#059669",
    totalBg: "#ecfdf5",
  },
  equipment: {
    label: "Equipment Cost Report",
    fileLabel: "Equipment_Cost_Report",
    heading: "🚜 Equipment Expenses",
    banner: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)",
    stripBg: "#eff6ff",
    stripBorder: "#bfdbfe",
    tableHead: "linear-gradient(90deg, #1e3a8a, #2563eb)",
    accent: "#2563eb",
    totalLine: "#3b82f6",
    totalInk: "#1e40af",
    totalBg: "#eff6ff",
  },
  other: {
    label: "Other Cost Report",
    fileLabel: "Other_Cost_Report",
    heading: "💸 Miscellaneous Expenses",
    banner: "linear-gradient(135deg, #581c87 0%, #7e22ce 50%, #a855f7 100%)",
    stripBg: "#faf5ff",
    stripBorder: "#e9d5ff",
    tableHead: "linear-gradient(90deg, #581c87, #7e22ce)",
    accent: "#7e22ce",
    totalLine: "#a855f7",
    totalInk: "#6b21a8",
    totalBg: "#faf5ff",
  },
  contractor: {
    label: "Contractor Report",
    fileLabel: "Project_Contractor_Report",
    heading: "👷 Contractors",
    banner: "linear-gradient(135deg, #0f172a 0%, #1e40af 60%, #3a78b5 100%)",
    stripBg: "#eff6ff",
    stripBorder: "#bfdbfe",
    tableHead: "linear-gradient(90deg, #1e40af, #3a78b5)",
    accent: "#059669",
    totalLine: "#3a78b5",
    totalInk: "#1e40af",
    totalBg: "#eff6ff",
  },
};

const css = (t: Theme) => `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Noto Sans', -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
         line-height: 1.5; color: #374151; margin: 0; background: #fff; }
  .banner { background: ${t.banner}; color: #fff; padding: 28px 32px; border-radius: 12px 12px 0 0; }
  .eyebrow { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: .7; margin-bottom: 6px; font-weight: 500; }
  .title { font-size: 26px; font-weight: 800; letter-spacing: -.5px; }
  .strip { background: ${t.stripBg}; border: 1px solid ${t.stripBorder}; border-top: none; border-radius: 0 0 12px 12px;
           padding: 12px 32px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; }
  .facts { display: flex; flex-wrap: wrap; gap: 8px 28px; }
  .fact-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
  .fact-value { font-size: 13px; color: #0f172a; font-weight: 700; margin-top: 2px; }
  .when { font-size: 11px; color: #64748b; text-align: right; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; }
  .card-head { background: ${t.tableHead}; color: #fff; padding: 12px 18px; border-radius: 11px 11px 0 0;
               font-size: 15px; font-weight: 700; letter-spacing: .3px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { background: #f8fafc; padding: 9px 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;
       letter-spacing: .8px; border-bottom: 2px solid #e2e8f0; text-align: left; }
  td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 12px; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .c { text-align: center; } .r { text-align: right; }
  .sr { font-size: 11px; font-weight: 600; color: #374151; width: 36px; }
  .name { font-weight: 700; color: #1e293b; }
  .sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  .faint { font-size: 10px; color: #94a3b8; font-weight: 400; }
  .strong { font-weight: 700; }
  .pill { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #475569; }
  tr.total td { background: ${t.totalBg}; border-top: 2px solid ${t.totalLine}; border-bottom: none;
                font-weight: 800; color: ${t.totalInk}; font-size: 13px; }
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
`;

const fact = (label: string, value: string, color = "#0f172a") =>
  `<div><div class="fact-label">${esc(label)}</div><div class="fact-value" style="color:${color}">${value}</div></div>`;

function page(t: Theme, report: CostReport, companyName: string, facts: string, body: string): string {
  const generatedOn = new Date().toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE,
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(t.label)} - ${esc(report.projectName)}</title><style>${css(t)}</style></head><body>
  <div class="banner"><div class="eyebrow">${esc(t.label)}</div><div class="title">${esc(report.projectName)}</div></div>
  <div class="strip">
    <div class="facts">${fact("Company", esc(companyName))}${fact("Generated By", esc(report.generatedBy))}${facts}</div>
    <div class="when">${esc(generatedOn)}</div>
  </div>
  ${body}
  <div class="footer">Generated by Xsite Application · ${esc(generatedOn)}</div>
</body></html>`;
}

function materialBody(t: Theme, rows: MaterialRow[]): { facts: string; body: string } {
  const specsOf = (m: MaterialRow) => m.specs.map(([k, v]) => `${k}: ${v}`).join(" | ");
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name) || specsOf(a).localeCompare(specsOf(b)));
  const total = sorted.reduce((sum, m) => sum + m.totalCost, 0);
  const unit = (m: MaterialRow) => (m.unit ? `<div class="faint">${esc(m.unit)}</div>` : "");

  const trs = sorted
    .map((m, i) => `<tr>
      <td class="sr">${i + 1}</td>
      <td><div class="name">${esc(m.name)}</div>
        ${m.specs.length ? `<div class="sub">${esc(specsOf(m))}</div>` : ""}
        ${m.unit ? `<div class="faint">Unit: ${esc(m.unit)}</div>` : ""}</td>
      <td class="c strong">${qty(m.totalImported)}${unit(m)}</td>
      <td class="c"><div class="sub">@ ${inr(m.perUnitCost)}/unit</div><div class="strong" style="color:${t.accent}">${inr(m.totalCost)}</div></td>
      <td style="font-size:11px;color:#475569">${m.vendors.length ? esc(m.vendors.join(", ")) : "—"}</td>
      <td class="c strong" style="color:#b45309">${qty(m.totalUsed)}${unit(m)}</td>
      <td class="c strong" style="color:#1d4ed8">${qty(m.currentlyAvailable)}${unit(m)}</td>
    </tr>`)
    .join("");

  return {
    facts: fact("Material Types", String(sorted.length)) + fact("Purchase Value", inr(total), t.accent),
    body: `<div class="card"><div class="card-head">${t.heading}</div><table>
      <thead><tr><th>Sr No</th><th>Material Name</th><th class="c" style="width:80px">Purchase</th>
        <th class="c" style="width:110px">Cost</th><th style="width:120px">Vendor</th>
        <th class="c" style="width:70px">Used</th><th class="c" style="width:80px">Remaining</th></tr></thead>
      <tbody>${trs}
        <tr class="total"><td colspan="3">GRAND TOTAL</td><td class="c">${inr(total)}</td><td colspan="3"></td></tr>
      </tbody></table></div>`,
  };
}

function equipmentBody(t: Theme, rows: EquipmentRow[]): { facts: string; body: string } {
  const total = rows.reduce((sum, e) => sum + e.totalCost, 0);
  const totalQty = rows.reduce((sum, e) => sum + e.quantity, 0);
  const costType = (e: EquipmentRow) =>
    e.costType === "rental" && e.rentalPeriod && e.rentalDuration
      ? `Rental (${e.rentalDuration} ${e.rentalPeriod})`
      : (e.costType || "purchase").toUpperCase();
  const specs = (e: EquipmentRow) =>
    [
      e.brand && `Brand: ${e.brand}`,
      e.model && `Model: ${e.model}`,
      e.capacity && `Capacity: ${e.capacity}`,
      e.fuelType && `Fuel: ${e.fuelType}`,
      e.operatorRequired && "Operator: Required",
    ].filter(Boolean).join(" | ");

  const trs = rows
    .map((e, i) => `<tr>
      <td class="sr">${i + 1}</td>
      <td><div class="name">${esc(e.type)}</div>
        ${e.category ? `<div class="sub">Category: ${esc(e.category)}</div>` : ""}
        ${specs(e) ? `<div class="sub" style="color:#0284c7;font-weight:500">${esc(specs(e))}</div>` : ""}</td>
      <td class="c"><span class="pill">${esc(costType(e))}</span></td>
      <td class="c strong">${qty(e.quantity)}</td>
      <td class="r" style="font-size:11px;color:#64748b">${inr(e.perUnitCost)}</td>
      <td class="r strong" style="color:${t.accent}">${inr(e.totalCost)}</td>
      <td style="font-size:11px;color:#64748b"><div>${shortDate(e.date)}</div>
        ${e.notes ? `<div class="sub" style="font-style:italic;color:#475569">${esc(e.notes)}</div>` : ""}</td>
    </tr>`)
    .join("");

  return {
    facts: fact("Total Entries", String(rows.length)) + fact("Total Cost", inr(total), t.accent),
    body: `<div class="card"><div class="card-head">${t.heading}</div><table>
      <thead><tr><th>Sr No</th><th>Equipment Details</th><th class="c" style="width:120px">Cost Type</th>
        <th class="c" style="width:60px">Qty</th><th class="r" style="width:100px">Rate</th>
        <th class="r" style="width:110px">Total Cost</th><th style="width:140px">Date &amp; Notes</th></tr></thead>
      <tbody>${trs}
        <tr class="total"><td colspan="3">GRAND TOTAL</td><td class="c">${qty(totalQty)}</td><td></td>
          <td class="r">${inr(total)}</td><td></td></tr>
      </tbody></table></div>`,
  };
}

function otherCostBody(t: Theme, rows: OtherCostRow[]): { facts: string; body: string } {
  const total = rows.reduce((sum, o) => sum + o.amount, 0);
  const trs = rows
    .map((o, i) => `<tr>
      <td class="sr">${i + 1}</td>
      <td><div class="name">${esc(o.title)}</div><div class="sub">Category: ${esc(o.category || "Miscellaneous")}</div></td>
      <td style="font-size:11px;color:#475569">${o.description ? esc(o.description) : "—"}</td>
      <td class="c" style="font-size:11px;color:#64748b">${shortDate(o.date)}</td>
      <td class="r strong" style="color:#b45309">${inr(o.amount)}</td>
    </tr>`)
    .join("");

  return {
    facts: fact("Total Entries", String(rows.length)) + fact("Total Amount", inr(total), t.accent),
    body: `<div class="card"><div class="card-head">${t.heading}</div><table>
      <thead><tr><th>Sr No</th><th>Expense</th><th>Description</th><th class="c" style="width:100px">Date</th>
        <th class="r" style="width:120px">Amount</th></tr></thead>
      <tbody>${trs}
        <tr class="total"><td colspan="4">GRAND TOTAL</td><td class="r">${inr(total)}</td></tr>
      </tbody></table></div>`,
  };
}

function contractorBody(t: Theme, rows: ContractorRow[]): { facts: string; body: string } {
  const contractTotal = rows.reduce((sum, c) => sum + c.totalAmount, 0);
  const paidTotal = rows.reduce((sum, c) => sum + c.totalPaid, 0);

  const paymentsTable = (payments: ContractorPayment[]) => {
    if (payments.length === 0) {
      return `<div style="padding:18px;text-align:center;color:#64748b;font-style:italic">No payments recorded.</div>`;
    }
    // Grouped by day, oldest first, each day with its total
    const byDay = new Map<string, ContractorPayment[]>();
    for (const p of [...payments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())) {
      const day = longDate(p.paymentDate);
      byDay.set(day, [...(byDay.get(day) ?? []), p]);
    }
    const groups = [...byDay.entries()]
      .map(([day, ps]) => `
        <tr><td colspan="3" style="background:#059669;color:#fff;font-weight:600">
          💰 ${esc(day)} — Total Paid: ${inr(ps.reduce((s, p) => s + p.amount, 0))}</td></tr>
        ${ps.map((p) => `<tr>
          <td style="width:110px"><span class="pill" style="background:#dcfce7;color:#166534">${esc((p.paymentType || "payment").toUpperCase())}</span></td>
          <td style="font-size:11px">${p.notes ? esc(p.notes) : "Payment recorded"}</td>
          <td class="r strong" style="color:#059669;width:120px">${inr(p.amount)}</td></tr>`).join("")}`)
      .join("");
    return `<table><thead><tr><th>Payment Type</th><th>Description</th><th class="r">Amount</th></tr></thead>
      <tbody>${groups}</tbody></table>`;
  };

  const cards = rows
    .map((c) => {
      const remaining = c.totalAmount - c.totalPaid;
      return `<div class="card">
        <div class="card-head">${esc(c.name)}${c.contractType ? ` <span style="font-weight:500;opacity:.85">· ${esc(c.contractType)}</span>` : ""}</div>
        <div style="display:flex;gap:28px;padding:12px 18px;border-bottom:1px solid #e2e8f0">
          ${fact("Contract Amount", inr(c.totalAmount))}
          ${fact("Paid", inr(c.totalPaid), "#059669")}
          ${fact(remaining < 0 ? "Paid Over Contract" : "Remaining", inr(Math.abs(remaining)), remaining < 0 ? "#b91c1c" : t.totalInk)}
        </div>
        ${paymentsTable(c.payments)}
      </div>`;
    })
    .join("");

  return {
    facts:
      fact("Contractors", String(rows.length)) +
      fact("Contract Total", inr(contractTotal)) +
      fact("Paid", inr(paidTotal), t.accent),
    body: cards,
  };
}

/** The report as a printable A4 page. */
export function costReportHtml(report: CostReport, companyName: string): string {
  const t = THEMES[report.type];
  const parts =
    report.type === "material"
      ? materialBody(t, report.rows)
      : report.type === "equipment"
        ? equipmentBody(t, report.rows)
        : report.type === "other"
          ? otherCostBody(t, report.rows)
          : contractorBody(t, report.rows);
  return page(t, report, companyName, parts.facts, parts.body);
}
