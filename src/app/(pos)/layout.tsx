export default function PosLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[var(--cacao)] text-[var(--cacao)]">
      <div className="mx-auto min-h-screen w-full max-w-7xl bg-[var(--blush)]">{children}</div>
    </main>
  );
}
