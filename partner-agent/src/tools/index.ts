import type { ToolResult } from "../types.js";
import {
  getContractTerms,
  getPartnerContext,
  getPriceList,
  getTierBenefits,
  searchDocs,
} from "./implementations.js";

type Executor = (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;

export const tools: Record<string, Executor> = {
  get_partner_context: (a) => getPartnerContext(a as { partnerId: string }),
  get_contract_terms: (a) => getContractTerms(a as { partnerId: string; contractId?: string }),
  get_price_list: (a) => getPriceList(a as { skus: string[]; region: string }),
  get_tier_benefits: (a) => getTierBenefits(a as { tier: string }),
  search_docs: (a) => searchDocs(a as { query: string; region?: string }),
};