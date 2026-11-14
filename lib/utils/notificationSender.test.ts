import { PushToken } from "@/lib/models/PushToken";
import { getActivePartnerStaffIdsForProject } from "@/lib/services/partnershipService";
import { resolveRecipientsFromDB } from "./notificationSender";

jest.mock("@/lib/db", () => jest.fn(() => Promise.resolve()));
jest.mock("@/lib/models/PushToken", () => ({
  PushToken: { find: jest.fn() },
}));
jest.mock("@/lib/services/partnershipService", () => ({
  getActivePartnerStaffIdsForProject: jest.fn(),
}));

const mockPushTokenFind = PushToken.find as jest.Mock;
const mockGetActivePartnerStaffIds = getActivePartnerStaffIdsForProject as jest.Mock;

const mockFindReturns = (rows: unknown[]) => ({
  select: () => ({
    lean: () => Promise.resolve(rows),
  }),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("resolveRecipientsFromDB", () => {
  it("returns only admin recipients when no projectId is provided", async () => {
    mockPushTokenFind.mockReturnValueOnce(mockFindReturns([{ userId: "admin-1" }]));

    const recipients = await resolveRecipientsFromDB("client-1");

    expect(recipients).toEqual([{ userId: "admin-1", userType: "admin" }]);
    expect(mockGetActivePartnerStaffIds).not.toHaveBeenCalled();
  });

  it("includes active staff partners only for the given projectId alongside admins", async () => {
    mockPushTokenFind
      .mockReturnValueOnce(mockFindReturns([{ userId: "admin-1" }]))
      .mockReturnValueOnce(mockFindReturns([{ userId: "staff-partner-1" }]));
    mockGetActivePartnerStaffIds.mockResolvedValueOnce(["staff-partner-1"]);

    const recipients = await resolveRecipientsFromDB("client-1", "project-A");

    expect(mockGetActivePartnerStaffIds).toHaveBeenCalledWith("project-A");
    expect(mockPushTokenFind).toHaveBeenNthCalledWith(2, {
      userId: { $in: ["staff-partner-1"] },
      userType: "staff",
      isActive: true,
    });
    expect(recipients).toEqual([
      { userId: "admin-1", userType: "admin" },
      { userId: "staff-partner-1", userType: "staff" },
    ]);
  });

  it("skips staff token lookup when the project has no active staff partners", async () => {
    mockPushTokenFind.mockReturnValueOnce(mockFindReturns([{ userId: "admin-1" }]));
    mockGetActivePartnerStaffIds.mockResolvedValueOnce([]);

    const recipients = await resolveRecipientsFromDB("client-1", "project-B");

    expect(mockPushTokenFind).toHaveBeenCalledTimes(1);
    expect(recipients).toEqual([{ userId: "admin-1", userType: "admin" }]);
  });
});

