import Image from "next/image";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Mobile Top Branding Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--border-soft)] bg-white/92 px-4 shadow-[0_4px_16px_rgba(74,43,50,0.03)] backdrop-blur-xl lg:hidden">
        <Image
          src="/LOGOSCAP/simbolo_solo.svg"
          alt="Carpintería Ibarra Picado"
          width={32}
          height={32}
          className="rounded-lg"
          priority
        />
        <div>
          <p className="brand-heading text-[0.95rem] font-bold italic leading-none text-[var(--cacao)]">
            Ibarra Picado
          </p>
          <p className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-[var(--brand)]">
            Carpintería
          </p>
        </div>
      </header>

      <div className="min-h-screen lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 pb-24 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </>
  );
}
