import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-[#1A1A1A] text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-block">
              <Image
                src="/escortbella.svg"
                alt="Escort Bella"
                width={280}
                height={35}
                className="h-7 w-auto max-w-[260px] brightness-0 invert"
              />
            </Link>
            <p className="mt-3 text-sm text-white/60">
              Scopri le migliori escort vicino a te. Sfoglia le schede, leggi le recensioni e trova la escort perfetta per te in pochi click!
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 font-semibold text-white">Link utili</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/escort" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Escort</Link></li>
              <li><Link href="/registrazione" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Iscriviti</Link></li>
            </ul>
          </div>

          {/* Legal — link interni alle pagine che embeddano Iubenda via iframe. */}
          <div>
            <h3 className="mb-3 font-semibold text-white">Legale</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Privacy Policy</Link></li>
              <li><Link href="/termini" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Termini e condizioni</Link></li>
              <li><Link href="/cookie" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Support / Contacts */}
          <div>
            <h3 className="mb-3 font-semibold text-white">Supporto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:info.escortbella@gmail.com"
                  className="inline-flex items-center gap-2 transition-colors duration-200 ease-out hover:text-[#E91E8C]"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  info.escortbella@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+393520627731"
                  className="inline-flex items-center gap-2 transition-colors duration-200 ease-out hover:text-[#E91E8C]"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  +39 352 062 7731
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Riga finale: pagamenti a sinistra, copyright a destra (desktop).
            Su mobile si impila verticalmente per leggibilità. */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/40 sm:flex-row sm:gap-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <span className="text-xs uppercase tracking-wide text-white/50">
              Metodi di pagamento accettati
            </span>
            <div className="flex items-center gap-3">
              <VisaLogo />
              <MastercardLogo />
            </div>
          </div>
          <span className="text-center sm:text-right">
            &copy; {new Date().getFullYear()} Escort Bella. Tutti i diritti riservati.
          </span>
        </div>
      </div>
    </footer>
  );
}

function VisaLogo() {
  // Card bianca con scritta "VISA" in stile classico (bold italic blu Visa).
  return (
    <div className="flex h-9 w-14 items-center justify-center rounded-md bg-white shadow-sm">
      <svg viewBox="0 0 56 20" className="h-5 w-auto" aria-label="Visa">
        <text
          x="28"
          y="16"
          textAnchor="middle"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="18"
          fontWeight="900"
          fontStyle="italic"
          fill="#1A1F71"
          letterSpacing="-0.5"
        >
          VISA
        </text>
      </svg>
    </div>
  );
}

function MastercardLogo() {
  // Card bianca con i due cerchi (rosso + giallo) sovrapposti — il blend
  // produce l'arancio nell'intersezione tipico del logo. `isolation: isolate`
  // sull'svg confina il blend al suo stacking context (sennò "buca" il bianco
  // della card sotto). Sotto, il wordmark "mastercard" minuscolo.
  return (
    <div className="flex h-9 w-14 flex-col items-center justify-center gap-0.5 rounded-md bg-white px-1 py-1 shadow-sm">
      <svg
        viewBox="0 0 36 22"
        className="h-4 w-auto"
        aria-label="Mastercard"
        style={{ isolation: 'isolate' }}
      >
        <circle cx="14" cy="11" r="8" fill="#EB001B" />
        <circle
          cx="22"
          cy="11"
          r="8"
          fill="#F79E1B"
          style={{ mixBlendMode: 'multiply' }}
        />
      </svg>
      <span
        className="text-[6px] font-extrabold uppercase leading-none tracking-tight text-[#1A1A1A]/80"
        style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
      >
        mastercard
      </span>
    </div>
  );
}
