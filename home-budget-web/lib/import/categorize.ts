interface CategoryRule {
  categoryId: number;
  patterns: RegExp[];
}

interface Category {
  id: number;
  name: string;
}

const DEFAULT_PATTERNS: Record<string, RegExp[]> = {
  Groceries: [
    /colruyt/i,
    /delhaize/i,
    /aldi/i,
    /lidl/i,
    /carrefour/i,
    /albert\s*heijn/i,
    /spar/i,
  ],
  Restaurants: [
    /restaurant/i,
    /takeaway/i,
    /deliveroo/i,
    /uber\s*eats/i,
    /just\s*eat/i,
  ],
  Subscriptions: [
    /netflix/i,
    /spotify/i,
    /disney/i,
    /apple\.com/i,
    /google\s*storage/i,
  ],
  Fuel: [/\bq8\b/i, /total\s*energies/i, /\bshell\b/i, /esso/i, /lukoil/i],
  "Public Transit": [/nmbs/i, /sncb/i, /de\s*lijn/i, /stib/i, /\btec\b/i],
  Salary: [/salaris/i, /\bloon\b/i, /salary/i, /wedde/i],
  Utilities: [
    /electrabel/i,
    /engie/i,
    /luminus/i,
    /water-link/i,
    /farys/i,
  ],
  "Rent/Mortgage": [/\bhuur\b/i, /\brent\b/i, /hypotheek/i, /mortgage/i],
};

export function buildCategoryRules(categories: Category[]): CategoryRule[] {
  const nameToId = new Map(categories.map((c) => [c.name, c.id]));
  const rules: CategoryRule[] = [];

  for (const [name, patterns] of Object.entries(DEFAULT_PATTERNS)) {
    const id = nameToId.get(name);
    if (id !== undefined) {
      rules.push({ categoryId: id, patterns });
    }
  }

  return rules;
}

export function categorizeRow(
  description: string,
  rules: CategoryRule[]
): number | null {
  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(lower))) {
      return rule.categoryId;
    }
  }
  return null;
}
