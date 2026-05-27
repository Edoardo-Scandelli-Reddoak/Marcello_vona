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

          {/* Legal */}
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
                  href="mailto:supporto@directoryescort.it"
                  className="inline-flex items-center gap-2 transition-colors duration-200 ease-out hover:text-[#E91E8C]"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  supporto@directoryescort.it
                </a>
              </li>
              <li>
                <a
                  href="tel:+390212345678"
                  className="inline-flex items-center gap-2 transition-colors duration-200 ease-out hover:text-[#E91E8C]"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  +39 02 1234 5678
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} Directory Escort. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
}
