import { all } from "./db/driver.js";
import { getPartnerContext } from "./tools/implementations.js";
import type { InboundEvent, PartnerContext } from "./types.js";

interface ContextRow {
  id: string;
  name: string;
  tier: string;
  region: string;
  account_manager: string;
  onboarding_stage: string;
}

export function enrich(event: InboundEvent): PartnerContext | undefined {
  const partnerId = event.partnerId && event.partnerId.trim() ? event.partnerId.trim() : lookupPartnerId(event);
  const res = partnerId ? getPartnerContext({ partnerId }) : null;
  if (!res || !res.ok) return undefined;
  const row = res.data as ContextRow;
  return {
    partnerId: row.id,
    name: row.name,
    tier: row.tier,
    region: row.region,
    accountManager: row.account_manager,
    onboardingStage: row.onboarding_stage,
    activeContractIds: (res.data as { activeContractIds: string[] }).activeContractIds,
  };
}

function lookupPartnerId(event: InboundEvent): string | undefined {
  const partners = all<{ id: string; name: string }>("SELECT id, name FROM partners");
  const hay = `${event.subject} ${event.body} ${event.from}`.toLowerCase();
  const byName = partners.find((p) => p.name.toLowerCase().length >= 3 && hay.includes(p.name.toLowerCase()));
  return byName?.id;
}