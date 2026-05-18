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
            <div className="mt-4 flex items-center gap-2">
              <a
                href="#"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-[#E91E8C]"
              >
                <FooterFacebookIcon />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-[#E91E8C]"
              >
                <FooterInstagramIcon />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 ease-out hover:bg-[#E91E8C]"
              >
                <FooterTikTokIcon />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 font-semibold text-white">Link utili</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/escort" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Escort</Link></li>
              <li><Link href="/#come-funziona" className="transition-colors duration-200 ease-out hover:text-[#E91E8C]">Come funziona</Link></li>
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

function FooterFacebookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function FooterInstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FooterTikTokIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}
