'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-2xl font-bold text-[#1A1A1A]">Errore nel caricamento</h2>
      <p className="text-[#1A1A1A]/60">{error.message}</p>
      <Button onClick={reset} className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
        Riprova
      </Button>
    </div>
  );
}
