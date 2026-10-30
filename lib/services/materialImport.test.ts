import { materialKey, parseDate, parseNumber, parseSpecs, planImport, MAX_ROWS_PER_SHEET } from "./materialImport";

const sections = [
  { sectionId: "sec-a", name: "Building A", type: "building" },
  { sectionId: "sec-b", name: "Row Houses", type: "row house" },
];
const miniSections = [
  { id: "mini-1", name: "Ground Floor", sectionId: "sec-a" },
  { id: "mini-2", name: "First Floor", sectionId: "sec-a" },
];
const now = new Date("2026-01-01T00:00:00Z");

const plan = (purchases: any[], usages: any[] = []) =>
  planImport({ purchases, usages, sections, miniSections, now });

const cement = (row: number, extra: Record<string, unknown> = {}) => ({
  row,
  material: "Cement",
  unit: "bags",
  specs: "Brand: UltraTech, Grade: 53",
  quantity: 100,
  rate: 400,
  ...extra,
});

describe("cell parsing", () => {
  it("reads numbers with commas and currency", () => {
    expect(parseNumber("1,200.50")).toBe(1200.5);
    expect(parseNumber("₹ 450")).toBe(450);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeNaN();
  });

  it("reads day-first dates, Date cells and Excel serials", () => {
    expect((parseDate("15/03/2025") as Date).toISOString().slice(0, 10)).toBe("2025-03-15");
    expect((parseDate("15-03-25") as Date).toISOString().slice(0, 10)).toBe("2025-03-15");
    expect((parseDate(45731) as Date).toISOString().slice(0, 10)).toBe("2025-03-15");
    expect(parseDate("31/02/2025")).toBe("invalid");
    expect(parseDate("")).toBeNull();
  });

  it("turns specs text into key/value pairs", () => {
    expect(parseSpecs("Brand: UltraTech, Grade: 53")).toEqual({ brand: "UltraTech", grade: "53" });
    expect(parseSpecs("Item Type = Elbow; Diameter: 1 inch")).toEqual({ itemType: "Elbow", diameter: "1 inch" });
    expect(parseSpecs("red, glossy")).toEqual({ details: "red, glossy" });
    expect(parseSpecs("")).toEqual({});
  });

  it("matches materials ignoring case, spacing and spec order", () => {
    expect(materialKey("Cement ", "Bags", { grade: "53", brand: "ultratech" })).toBe(
      materialKey("cement", "bags", { brand: "UltraTech", grade: "53" })
    );
  });
});

describe("planImport", () => {
  it("adds purchases as stock and counts their cost", () => {
    const p = plan([cement(2, { vendor: "Shree Traders", billDate: "10/01/2025", amountPaid: 30000 })]);
    expect(p.errors).toEqual([]);
    expect(p.available).toHaveLength(1);
    expect(p.available[0]).toMatchObject({
      name: "Cement",
      qnt: 100,
      perUnitCost: 400,
      totalCost: 40000,
      contractor_name: "Shree Traders",
      amountPaid: 30000,
      paymentStatus: "partial",
    });
    expect(p.summary.totalPurchaseCost).toBe(40000);
  });

  it("derives payment status only when amount paid is given", () => {
    const p = plan([cement(2, { amountPaid: 40000 }), cement(3, { amountPaid: 0 }), cement(4)]);
    expect(p.available.map((a) => a.paymentStatus)).toEqual(["full", "unpaid", undefined]);
  });

  it("uses the oldest purchase first and prices usage per batch", () => {
    const p = plan(
      [cement(2, { quantity: 10, rate: 400 }), cement(3, { quantity: 10, rate: 420 })],
      [{ row: 2, material: "cement", unit: "Bags", specs: "grade: 53, brand: ultratech", quantity: 15, section: "building a", miniSection: "ground floor", date: "01/02/2025" }]
    );
    expect(p.errors).toEqual([]);
    expect(p.used).toEqual([
      expect.objectContaining({ qnt: 10, perUnitCost: 400, totalCost: 4000, sectionId: "sec-a", miniSectionId: "mini-1" }),
      expect.objectContaining({ qnt: 5, perUnitCost: 420, totalCost: 2100, sectionId: "sec-a", miniSectionId: "mini-1" }),
    ]);
    // first batch is used up and left out of stock; second keeps 5 but its purchase total
    expect(p.available).toEqual([expect.objectContaining({ qnt: 5, totalCost: 4200 })]);
    expect(p.summary).toMatchObject({ totalPurchaseCost: 8200, totalUsedCost: 6100, remainingStockRows: 1 });
  });

  it("rejects using more than was bought", () => {
    const p = plan([cement(2, { quantity: 10 })], [{ row: 2, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 11, section: "Building A" }]);
    expect(p.errors).toEqual([{ sheet: "Usage", row: 2, message: expect.stringContaining("only 10 is left") }]);
  });

  it("rejects usage of materials not on the Purchases sheet", () => {
    const p = plan([cement(2)], [{ row: 2, material: "Cement", unit: "bags", specs: "Grade: 43", quantity: 1, section: "Building A" }]);
    expect(p.errors[0]).toMatchObject({ sheet: "Usage", row: 2, message: expect.stringContaining("isn't on the Purchases sheet") });
  });

  it("checks sections and mini-sections when given", () => {
    const p = plan(
      [cement(2)],
      [
        { row: 2, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 1, section: "Tower Z" },
        { row: 3, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 1, section: "Row Houses", miniSection: "Ground Floor" },
        { row: 4, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 1, miniSection: "Terrace" },
      ]
    );
    expect(p.errors.map((e) => [e.row, e.message])).toEqual([
      [2, 'Section "Tower Z" doesn\'t exist in this project.'],
      [3, 'Mini-section "Ground Floor" doesn\'t exist in section "Row Houses".'],
      [4, 'Mini-section "Terrace" doesn\'t exist in this project.'],
    ]);
  });

  it("section, mini-section and date are optional", () => {
    const p = plan([cement(2)], [{ row: 2, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 10 }]);
    expect(p.errors).toEqual([]);
    expect(p.used).toHaveLength(1);
    expect(p.used[0].sectionId).toBeUndefined();
    expect(p.used[0].miniSectionId).toBeUndefined();
    expect(p.used[0].addedAt).toEqual(now);
  });

  it("fills in the section from a mini-section that exists in one section only", () => {
    const p = plan([cement(2)], [{ row: 2, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 1, miniSection: "first floor" }]);
    expect(p.errors).toEqual([]);
    expect(p.used[0]).toMatchObject({ sectionId: "sec-a", sectionName: "Building A", miniSectionId: "mini-2" });
  });

  it("asks for the section when a mini-section name is in several sections", () => {
    const p = planImport({
      purchases: [cement(2)],
      usages: [{ row: 2, material: "Cement", unit: "bags", specs: "Brand: UltraTech, Grade: 53", quantity: 1, miniSection: "Ground Floor" }],
      sections,
      miniSections: [...miniSections, { id: "mini-9", name: "Ground Floor", sectionId: "sec-b" }],
      now,
    });
    expect(p.errors[0].message).toBe('Mini-section "Ground Floor" is in more than one section. Fill in the Section column too.');
  });

  it("reports every problem on a purchase row", () => {
    const p = plan([{ row: 7, material: "", unit: "", quantity: "x", rate: -1, billDate: "someday" }]);
    expect(p.errors.map((e) => e.message)).toEqual([
      "Material name is missing.",
      "Unit is missing (for example: bags, kg, pieces).",
      "Quantity must be a number greater than 0.",
      "Rate per unit must be a number of 0 or more.",
      "Bill date isn't a date. Use DD/MM/YYYY.",
    ]);
    expect(p.errors.every((e) => e.row === 7 && e.sheet === "Purchases")).toBe(true);
  });

  it("rejects paying more than the total", () => {
    const p = plan([cement(2, { quantity: 1, rate: 100, amountPaid: 150 })]);
    expect(p.errors[0].message).toContain("more than the total cost");
  });

  it("ignores blank rows and requires at least one purchase", () => {
    expect(plan([{ row: 2, material: "", unit: " " }]).errors[0].message).toContain("no rows");
    expect(plan([cement(2), { row: 3 }]).summary.purchaseRows).toBe(1);
  });

  it("limits the number of rows", () => {
    const many = Array.from({ length: MAX_ROWS_PER_SHEET + 1 }, (_, i) => cement(i + 2));
    expect(plan(many).errors[0].message).toContain("Too many rows");
  });
});
