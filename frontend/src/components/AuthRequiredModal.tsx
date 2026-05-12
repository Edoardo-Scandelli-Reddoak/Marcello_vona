'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthRequiredModalProps {
  open: boolean;
  onClose: () => void;
  /** Where to come back after auth — defaults to current pathname. */
  next?: string;
  /** Title of the modal — defaults to "Accedi per continuare". */
  title?: string;
  /** Body message — has a default for the favorite-save scenario. */
  message?: string;
}

export default function AuthRequiredModal({
  open,
  onClose,
  next,
  title = 'Accedi per continuare',
  message = 'Per salvare una professionista nei preferiti devi avere un account.',
}: AuthRequiredModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const nextPath =
    next ||
    (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  const nextEncoded = encodeURIComponent(nextPath);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-title"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Chiudi"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* dialog */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#1A1A1A]/40 transition-colors hover:bg-[#1A1A1A]/[0.06] hover:text-[#1A1A1A]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E91E8C]/10">
          <Heart className="h-6 w-6 text-[#E91E8C]" fill="#E91E8C" />
        </div>

        <h2 id="auth-required-title" className="text-lg font-bold text-[#1A1A1A]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#1A1A1A]/65">{message}</p>

        <div className="mt-5 flex flex-col gap-2">
          <Link href={`/registrati?next=${nextEncoded}`} onClick={onClose}>
            <Button className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
              Registrati
            </Button>
          </Link>
          <Link href={`/login?next=${nextEncoded}`} onClick={onClose}>
            <Button variant="outline" className="w-full">
              Ho già un account — Accedi
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
