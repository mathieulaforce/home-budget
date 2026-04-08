export interface HoldingSummary {
  id: number;
  accountId: number;
  accountName: string;
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  latestPrice: number | null;
  priceDate: string | null;
  currentValue: number | null;
  gainLoss: number | null;
  returnPercent: number | null;
  allocationPercent: number | null;
  purchaseDate: string;
  isStale: boolean;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalReturnPercent: number;
  holdings: HoldingSummary[];
}

export interface PortfolioHistoryPoint {
  date: string;
  valueCents: number;
}

export interface AllocationSlice {
  label: string;
  valueCents: number;
  percent: number;
}
