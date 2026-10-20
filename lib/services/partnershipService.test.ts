import { Types } from 'mongoose';
import { Partnership } from '@/lib/models/Xsite/Partnership';
import { PartnershipTransaction } from '@/lib/models/Xsite/PartnershipTransaction';
import {
  buildSummaries,
  combineLedgerResults,
  parsePaidBy,
  recordAttributedPayments,
  resolvePaymentAttribution,
} from './partnershipService';

jest.mock('@/lib/models/Xsite/Partnership', () => ({
  Partnership: { findOne: jest.fn() },
}));
jest.mock('@/lib/models/Xsite/PartnershipTransaction', () => ({
  PartnershipTransaction: { insertMany: jest.fn(), updateMany: jest.fn(), aggregate: jest.fn() },
  PAYMENT_CATEGORIES: ['material', 'contractor', 'labor', 'equipment', 'other'],
}));

const mockFindOne = Partnership.findOne as jest.Mock;
const mockInsertMany = PartnershipTransaction.insertMany as jest.Mock;
const mockAggregate = PartnershipTransaction.aggregate as jest.Mock;

const projectId = new Types.ObjectId();
const partnershipId = new Types.ObjectId();
const clientId = new Types.ObjectId();

const partnership = {
  _id: partnershipId,
  clientId,
  projectId,
  projectName: 'Green Valley',
  status: 'active' as const,
  partners: [
    { partnerId: String(clientId), partnerType: 'owner' as const, name: 'Ravi Builders', status: 'active' as const, addedAt: new Date() },
    { partnerId: 'staff-suresh', partnerType: 'staff' as const, name: 'Suresh Patil', status: 'active' as const, addedAt: new Date() },
    { partnerId: 'staff-anil', partnerType: 'staff' as const, name: 'Anil Rao', status: 'removed' as const, addedAt: new Date() },
    { partnerId: 'staff-meena', partnerType: 'staff' as const, name: 'Meena Joshi', status: 'removed' as const, addedAt: new Date() },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('parsePaidBy', () => {
  it('treats a missing payer as nothing to attribute', () => {
    expect(parsePaidBy(undefined)).toEqual({ ok: true, value: null });
    expect(parsePaidBy(null)).toEqual({ ok: true, value: null });
  });

  it('accepts the pool and trimmed partner ids', () => {
    expect(parsePaidBy({ type: 'pool' })).toEqual({ ok: true, value: { type: 'pool' } });
    expect(parsePaidBy({ type: 'partner', partnerId: ' staff-suresh ' })).toEqual({
      ok: true,
      value: { type: 'partner', partnerId: 'staff-suresh' },
    });
  });

  it('rejects anything else', () => {
    expect(parsePaidBy('pool').ok).toBe(false);
    expect(parsePaidBy({ type: 'partner' }).ok).toBe(false);
    expect(parsePaidBy({ type: 'bank' }).ok).toBe(false);
  });
});

describe('resolvePaymentAttribution', () => {
  const findReturns = (doc: unknown) => mockFindOne.mockReturnValue({ lean: () => Promise.resolve(doc) });

  it('skips the lookup when no payer was sent', async () => {
    expect(await resolvePaymentAttribution(projectId, undefined)).toEqual({ ok: true, value: null });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('ignores the payer on projects without an active partnership', async () => {
    findReturns(null);
    expect(await resolvePaymentAttribution(projectId, { type: 'pool' })).toEqual({ ok: true, value: null });
  });

  it('attributes to the pool or an active partner', async () => {
    findReturns(partnership);
    const pool = await resolvePaymentAttribution(String(projectId), { type: 'pool' });
    expect(pool.ok && pool.value?.paidBy).toEqual({ type: 'pool' });

    const partner = await resolvePaymentAttribution(projectId, { type: 'partner', partnerId: 'staff-suresh' });
    expect(partner.ok && partner.value?.partner?.name).toBe('Suresh Patil');
  });

  it('refuses a removed or unknown partner before anything is written', async () => {
    findReturns(partnership);
    expect((await resolvePaymentAttribution(projectId, { type: 'partner', partnerId: 'staff-anil' })).ok).toBe(false);
    expect((await resolvePaymentAttribution(projectId, { type: 'partner', partnerId: 'nobody' })).ok).toBe(false);
  });
});

describe('recordAttributedPayments', () => {
  const attribution = {
    partnership,
    paidBy: { type: 'partner' as const, partnerId: 'staff-suresh' },
    partner: partnership.partners[1],
  };

  it('does nothing without an attribution', async () => {
    expect(await recordAttributedPayments(null, [{ category: 'labor', amount: 500, sourceIds: ['l1'] }])).toEqual({
      status: 'skipped',
      count: 0,
    });
    expect(mockInsertMany).not.toHaveBeenCalled();
  });

  it('writes one line per paid row and links it to the cost row', async () => {
    mockInsertMany.mockResolvedValue([]);
    const batchId = new Types.ObjectId();
    const result = await recordAttributedPayments(
      attribution,
      [
        { category: 'material', amount: 12500.456, sourceIds: [batchId, undefined], label: 'Cement' },
        { category: 'material', amount: 0, sourceIds: ['unpaid-batch'] },
      ],
      { userId: 'u1', fullName: 'Ravi' }
    );

    expect(result).toEqual({ status: 'recorded', count: 1 });
    const [docs] = mockInsertMany.mock.calls[0];
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      kind: 'payment',
      category: 'material',
      amount: 12500.46,
      paidFrom: 'partner',
      partnerId: 'staff-suresh',
      partnerName: 'Suresh Patil',
      source: { entity: 'material', ids: [String(batchId)], label: 'Cement' },
      recordedBy: { userId: 'u1', fullName: 'Ravi' },
    });
  });

  it('reports a failed write instead of throwing, since the payment itself was saved', async () => {
    mockInsertMany.mockRejectedValue(new Error('db down'));
    const result = await recordAttributedPayments(attribution, [{ category: 'other', amount: 100, sourceIds: ['o1'] }]);
    expect(result.status).toBe('failed');
    expect(result.message).toMatch(/couldn't be added/);
  });
});

describe('combineLedgerResults', () => {
  it('surfaces any failure, otherwise adds up what was recorded', () => {
    expect(combineLedgerResults([{ status: 'skipped', count: 0 }])).toEqual({ status: 'skipped', count: 0 });
    expect(
      combineLedgerResults([
        { status: 'recorded', count: 2 },
        { status: 'recorded', count: 1 },
      ])
    ).toEqual({ status: 'recorded', count: 3 });
    expect(
      combineLedgerResults([
        { status: 'recorded', count: 2 },
        { status: 'failed', count: 0, message: 'nope' },
      ])
    ).toEqual({ status: 'failed', count: 0, message: 'nope' });
  });
});

describe('buildSummaries', () => {
  const row = (kind: string, category: string, paidFrom: string, partnerId: string | undefined, amount: number, count = 1) => ({
    _id: { partnershipId, kind, category, paidFrom, partnerId },
    amount,
    count,
  });

  it('shows who has put in how much, and what is left in the pool', async () => {
    mockAggregate.mockResolvedValue([
      // Owner: 10,00,000 in, then pays a 50,000 material bill himself
      row('contribution', 'initial', 'partner', String(clientId), 1000000),
      row('payment', 'material', 'partner', String(clientId), 50000),
      // Suresh: 5,00,000 in, 1,00,000 added later, pays the contractor 30,000
      row('contribution', 'initial', 'partner', 'staff-suresh', 500000),
      row('contribution', 'additional', 'partner', 'staff-suresh', 100000),
      row('payment', 'contractor', 'partner', 'staff-suresh', 30000),
      // Labour of 12,000 paid out of the pool
      row('payment', 'labor', 'pool', undefined, 12000, 3),
      // Anil left after putting in 20,000; Meena left with nothing
      row('contribution', 'initial', 'partner', 'staff-anil', 20000),
    ]);

    const summary = (await buildSummaries([partnership])).get(String(partnershipId))!;

    expect(summary.partners.map((p) => p.name)).toEqual(['Ravi Builders', 'Suresh Patil', 'Anil Rao']);

    const [owner, suresh, anil] = summary.partners;
    expect(owner.contributed).toEqual({ initial: 1000000, additional: 0, total: 1000000 });
    expect(owner.paid.material).toBe(50000);
    expect(owner.total).toBe(1050000);
    expect(suresh.contributed).toEqual({ initial: 500000, additional: 100000, total: 600000 });
    expect(suresh.paid.contractor).toBe(30000);
    expect(suresh.total).toBe(630000);
    expect(anil.status).toBe('removed');
    expect(anil.total).toBe(20000);

    // 10,50,000 + 6,30,000 + 20,000 = 17,00,000 put in altogether
    expect(summary.totals.invested).toBe(1700000);
    expect(owner.sharePercent).toBe(61.8);
    expect(suresh.sharePercent).toBe(37.1);
    expect(anil.sharePercent).toBe(1.2);

    // Pool: 16,20,000 deposited, 12,000 spent from it
    expect(summary.pool.deposited).toBe(1620000);
    expect(summary.pool.spent.labor).toBe(12000);
    expect(summary.pool.balance).toBe(1608000);
    expect(summary.totals.paidByPartners).toBe(80000);
    expect(summary.totals.spent).toBe(92000);
    expect(summary.transactionCount).toBe(9);
  });

  it('starts every active partner at zero before any money arrives', async () => {
    mockAggregate.mockResolvedValue([]);
    const summary = (await buildSummaries([partnership])).get(String(partnershipId))!;
    expect(summary.partners.map((p) => [p.name, p.total, p.sharePercent])).toEqual([
      ['Ravi Builders', 0, 0],
      ['Suresh Patil', 0, 0],
    ]);
    expect(summary.pool.balance).toBe(0);
  });
});
