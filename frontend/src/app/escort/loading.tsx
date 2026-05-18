export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 h-10 w-48 animate-pulse rounded-lg bg-[#1A1A1A]/10" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-xl bg-[#1A1A1A]/5" />
        ))}
      </div>
    </div>
  );
}
