import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  BarChart3,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Overview", href: "/overview", icon: LayoutDashboard },
  { title: "Accounts", href: "/accounts", icon: Wallet },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { title: "Budgets", href: "/budgets", icon: Target },
  { title: "Comparisons", href: "/comparisons", icon: BarChart3 },
  { title: "Stocks", href: "/stocks", icon: TrendingUp },
];
