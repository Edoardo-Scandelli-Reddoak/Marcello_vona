'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const STORAGE_KEY = 'age_verified_v1';

export default function AgeGate() {
  // `null` = stato non ancora letto da localStorage (durante l'hydration).
  // `true` = utente ha confermato in passato → non mostriamo nulla.
  // `false` = mai confermato → mostriamo il gate.
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setVerified(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // Se localStorage è disabilitato (es. iframe / private mode), trattiamo
      // come "non verificato" → l'utente deve confermare ogni volta.
      setVerified(false);
    }
  }, []);

  const handleEnter = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVerified(true);
  };

  const handleLeave = () => {
    // Rimanda l'utente a Google se non è maggiorenne.
    window.location.href = 'https://www.google.com';
  };

  // Durante l'hydration o se già verificato → non blocchiamo nulla.
  if (verified === null || verified === true) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A1A]/90 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex justify-center">
          <Image
            src="/escortbella.svg"
            alt="Escort Bella"
            width={240}
            height={30}
            className="h-7 w-auto"
            priority
          />
        </div>

        <h2
          id="agegate-title"
          className="mb-2 text-center text-2xl font-bold text-[#1A1A1A]"
        >
          Sei maggiorenne?
        </h2>
        <p className="mb-6 text-center text-sm text-[#1A1A1A]/70">
          Questo sito contiene materiale riservato a un pubblico <strong>adulto (18+)</strong>.
          Per continuare devi confermare di avere almeno 18 anni.
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleEnter}
            className="w-full rounded-xl bg-[#E91E8C] py-3 h-auto text-base font-semibold text-white hover:bg-[#D11A7D]"
          >
            Ho 18 anni o più — entra
          </Button>
          <Button
            onClick={handleLeave}
            variant="outline"
            className="w-full rounded-xl py-3 h-auto text-base font-medium text-[#1A1A1A]/70"
          >
            Esci
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-[#1A1A1A]/50">
          Accedendo accetti i nostri{' '}
          <a href="/termini" className="text-[#E91E8C] hover:underline">Termini</a>
          {' '}e la nostra{' '}
          <a href="/privacy" className="text-[#E91E8C] hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
