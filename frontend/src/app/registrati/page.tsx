'use client';

import Link from 'next/link';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';

export default function RegistratiPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-[#1A1A1A] sm:text-4xl">Crea il tuo account</h1>
        <p className="mt-3 text-[#1A1A1A]/60">Scegli il tipo di account che vuoi creare.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/registrati/utente"
          className="group flex flex-col rounded-2xl border border-[#1A1A1A]/10 bg-white p-7 transition-shadow duration-200 ease-out hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A]/[0.06]">
            <Heart className="h-6 w-6 text-[#1A1A1A]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Sono un utente</h2>
          <p className="mt-2 text-sm text-[#1A1A1A]/65">
            Cerco escort, voglio salvare i preferiti e lasciare recensioni.
          </p>
          <ul className="mt-4 flex-1 space-y-1 text-sm text-[#1A1A1A]/70">
            <li>• Salva le escort nei preferiti</li>
            <li>• Lascia recensioni</li>
            <li>• Identità riservata: usi solo un nome di visualizzazione</li>
          </ul>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] transition-transform duration-200 ease-out group-hover:translate-x-1">
            Continua come utente <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/registrazione"
          className="group flex flex-col rounded-2xl border border-[#E91E8C]/30 bg-gradient-to-br from-[#E91E8C]/5 to-transparent p-7 transition-shadow duration-200 ease-out hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E91E8C]/10">
            <Sparkles className="h-6 w-6 text-[#E91E8C]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Sono un&apos;escort</h2>
          <p className="mt-2 text-sm text-[#1A1A1A]/65">
            Voglio creare la mia scheda per essere trovata da nuove clienti.
          </p>
          <ul className="mt-4 flex-1 space-y-1 text-sm text-[#1A1A1A]/70">
            <li>• Scheda completa con foto e bio</li>
            <li>• Verifica età automatica</li>
            <li>• Visibile sulla mappa con abbonamento attivo</li>
          </ul>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#E91E8C] transition-transform duration-200 ease-out group-hover:translate-x-1">
            Continua come escort <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-[#1A1A1A]/55">
        Hai già un account? <Link href="/login" className="font-medium text-[#E91E8C] hover:underline">Accedi</Link>
      </p>
    </div>
  );
}
