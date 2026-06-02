import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="min-h-screen lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 pb-24 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </>
  );
}
