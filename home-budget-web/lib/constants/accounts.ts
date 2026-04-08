export type AccountType = "checking" | "savings" | "investment" | "credit_card";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  investment: "Investment",
  credit_card: "Credit Card",
};

export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as AccountType, label })
);
