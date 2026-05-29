import { expect } from "@playwright/test";
import { authHeaders, getApiBase } from "../fixtures/api-auth";

const apiBase = () => getApiBase();

export async function ensureCanadaDealForSales1(
  request: import("@playwright/test").APIRequestContext,
  stage: "new_lead" | "contacted" = "new_lead",
) {
  const managerHeaders = {
    ...(await authHeaders("manager")),
    "Content-Type": "application/json",
  };
  const salesHeaders = await authHeaders("sales");
  const meRes = await request.get(`${apiBase()}/api/me`, { headers: salesHeaders });
  const sales1 = (await meRes.json()) as { id: string };

  const listRes = await request.get(`${apiBase()}/api/deals`, { headers: managerHeaders });
  const deals = (await listRes.json()) as {
    id: string;
    title: string;
    ownerId: string;
    stage: string;
  }[];
  const deal = deals.find((d) => d.title === "Canada application");
  expect(deal).toBeTruthy();

  if (deal!.ownerId !== sales1.id) {
    await request.patch(`${apiBase()}/api/deals/${deal!.id}/owner`, {
      headers: managerHeaders,
      data: { ownerId: sales1.id },
    });
  }
  if (deal!.stage !== stage) {
    await request.patch(`${apiBase()}/api/deals/${deal!.id}/stage`, {
      headers: managerHeaders,
      data: { stage },
    });
  }

  return deal!;
}
