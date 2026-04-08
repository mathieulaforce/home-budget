"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS } from "@/lib/constants/navigation";

export function Header() {
  const pathname = usePathname();
  const activeItem = NAV_ITEMS.find((item) =>
    item.href === "/overview"
      ? pathname === "/overview"
      : pathname.startsWith(item.href)
  );
  const sectionName = activeItem?.title ?? "Home Budget";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-medium">{sectionName}</h1>
    </header>
  );
}
