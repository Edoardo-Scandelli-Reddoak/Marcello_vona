export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="h-96 animate-pulse rounded-2xl bg-[#1A1A1A]/5" />
        </div>
        <div>
          <div className="h-72 animate-pulse rounded-2xl bg-[#1A1A1A]/5" />
        </div>
      </div>
    </div>
  );
}
