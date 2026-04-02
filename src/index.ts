/**
 * FDA MCP — US Food and Drug Administration public API (free, no auth)
 *
 * Tools:
 * - search_drug_events: Search FDA adverse drug event (FAERS) reports
 * - search_drug_labels: Search FDA drug labeling / package inserts
 * - search_food_recalls: Search FDA food enforcement / recall reports
 */

interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

const BASE = 'https://api.fda.gov';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_drug_events',
    description:
      'Search FDA adverse drug event (FAERS) reports. Returns reports matching the query, including patient reactions, drug details, and outcomes.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query using openFDA syntax (e.g., "patient.drug.medicinalproduct:aspirin" or just a drug name)',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default 5, max 100)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_drug_labels',
    description:
      'Search FDA drug labeling (package inserts). Returns label sections such as indications, warnings, dosage, and adverse reactions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., a drug brand name, generic name, or active ingredient)',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default 5, max 100)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_food_recalls',
    description:
      'Search FDA food enforcement / recall records. Returns product recalls, reasons for recall, distribution patterns, and recall status.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., a product name, company, or reason for recall). Omit to get recent recalls.',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default 10, max 100)',
        },
      },
      required: [],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_drug_events':
      return searchDrugEvents(args.query as string, args.limit as number | undefined);
    case 'search_drug_labels':
      return searchDrugLabels(args.query as string, args.limit as number | undefined);
    case 'search_food_recalls':
      return searchFoodRecalls(args.query as string | undefined, args.limit as number | undefined);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function searchDrugEvents(query: string, limit = 5) {
  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
  });
  const res = await fetch(`${BASE}/drug/event.json?${params}`);
  if (!res.ok) throw new Error(`FDA API error: ${res.status}`);

  const data = (await res.json()) as {
    meta: { results: { total: number; skip: number; limit: number } };
    results: {
      safetyreportid: string;
      receivedate: string;
      seriousness: string;
      patient: {
        patientsex?: string;
        patientage?: string;
        reaction?: { reactionmeddrapt: string; reactionoutcome?: string }[];
        drug?: {
          medicinalproduct?: string;
          drugindication?: string;
          drugdosagetext?: string;
          drugcharacterization?: string;
        }[];
      };
      primarysourcecountry?: string;
    }[];
  };

  return {
    query,
    total: data.meta?.results?.total ?? 0,
    limit,
    results: (data.results ?? []).map((r) => ({
      safety_report_id: r.safetyreportid,
      receive_date: r.receivedate,
      seriousness: r.seriousness,
      country: r.primarysourcecountry ?? null,
      patient: {
        sex: r.patient?.patientsex ?? null,
        age: r.patient?.patientage ?? null,
        reactions: (r.patient?.reaction ?? []).map((rx) => ({
          reaction: rx.reactionmeddrapt,
          outcome: rx.reactionoutcome ?? null,
        })),
        drugs: (r.patient?.drug ?? []).map((d) => ({
          name: d.medicinalproduct ?? null,
          indication: d.drugindication ?? null,
          dosage: d.drugdosagetext ?? null,
          characterization: d.drugcharacterization ?? null,
        })),
      },
    })),
  };
}

async function searchDrugLabels(query: string, limit = 5) {
  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
  });
  const res = await fetch(`${BASE}/drug/label.json?${params}`);
  if (!res.ok) throw new Error(`FDA API error: ${res.status}`);

  const data = (await res.json()) as {
    meta: { results: { total: number; skip: number; limit: number } };
    results: {
      id: string;
      set_id?: string;
      openfda?: {
        brand_name?: string[];
        generic_name?: string[];
        manufacturer_name?: string[];
        product_type?: string[];
        route?: string[];
        substance_name?: string[];
      };
      indications_and_usage?: string[];
      warnings?: string[];
      dosage_and_administration?: string[];
      adverse_reactions?: string[];
      contraindications?: string[];
      description?: string[];
    }[];
  };

  return {
    query,
    total: data.meta?.results?.total ?? 0,
    limit,
    results: (data.results ?? []).map((r) => ({
      id: r.id,
      brand_name: r.openfda?.brand_name?.[0] ?? null,
      generic_name: r.openfda?.generic_name?.[0] ?? null,
      manufacturer: r.openfda?.manufacturer_name?.[0] ?? null,
      product_type: r.openfda?.product_type?.[0] ?? null,
      route: r.openfda?.route?.[0] ?? null,
      substances: r.openfda?.substance_name ?? [],
      indications_and_usage: r.indications_and_usage?.[0] ?? null,
      warnings: r.warnings?.[0] ?? null,
      dosage_and_administration: r.dosage_and_administration?.[0] ?? null,
      adverse_reactions: r.adverse_reactions?.[0] ?? null,
      contraindications: r.contraindications?.[0] ?? null,
      description: r.description?.[0] ?? null,
    })),
  };
}

async function searchFoodRecalls(query?: string, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set('search', query);

  const res = await fetch(`${BASE}/food/enforcement.json?${params}`);
  if (!res.ok) throw new Error(`FDA API error: ${res.status}`);

  const data = (await res.json()) as {
    meta: { results: { total: number; skip: number; limit: number } };
    results: {
      recall_number: string;
      status: string;
      recalling_firm: string;
      product_description: string;
      reason_for_recall: string;
      product_quantity: string;
      distribution_pattern: string;
      recall_initiation_date: string;
      report_date: string;
      classification: string;
      voluntary_mandated: string;
      state: string;
      country: string;
    }[];
  };

  return {
    query: query ?? null,
    total: data.meta?.results?.total ?? 0,
    limit,
    results: (data.results ?? []).map((r) => ({
      recall_number: r.recall_number,
      status: r.status,
      classification: r.classification,
      voluntary_mandated: r.voluntary_mandated,
      recalling_firm: r.recalling_firm,
      product_description: r.product_description,
      reason_for_recall: r.reason_for_recall,
      product_quantity: r.product_quantity,
      distribution_pattern: r.distribution_pattern,
      recall_initiation_date: r.recall_initiation_date,
      report_date: r.report_date,
      state: r.state,
      country: r.country,
    })),
  };
}

export default { tools, callTool } satisfies McpToolExport;
