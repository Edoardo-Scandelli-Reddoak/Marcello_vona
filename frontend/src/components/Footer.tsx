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

        {/* Metodi di pagamento accettati */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-white/10 pt-6 sm:flex-row sm:gap-4">
          <span className="text-xs uppercase tracking-wide text-white/40">
            Metodi di pagamento
          </span>
          <div className="flex items-center gap-2">
            <VisaLogo />
            <MastercardLogo />
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} Escort Bella. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
}

function VisaLogo() {
  return (
    <div className="flex h-7 w-12 items-center justify-center rounded-md bg-white px-1.5 shadow-sm">
      <svg viewBox="0 0 48 16" className="h-3.5 w-full" aria-label="Visa">
        <text x="0" y="13" fontFamily="Helvetica, Arial, sans-serif" fontSize="14" fontWeight="900" fontStyle="italic" fill="#1A1F71">
          VISA
        </text>
      </svg>
    </div>
  );
}

function MastercardLogo() {
  return (
    <div className="flex h-7 w-12 items-center justify-center rounded-md bg-white px-1.5 shadow-sm">
      <svg viewBox="0 0 32 20" className="h-4 w-auto" aria-label="Mastercard">
        <circle cx="12" cy="10" r="7" fill="#EB001B" />
        <circle cx="20" cy="10" r="7" fill="#F79E1B" opacity="0.9" />
      </svg>
    </div>
  );
}
