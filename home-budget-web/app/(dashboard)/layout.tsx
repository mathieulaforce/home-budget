import { SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarInset>
      <Header />
      <main className="flex-1 p-6">{children}</main>
    </SidebarInset>
  );
}
