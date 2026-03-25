import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t bg-[#1A1A1A] text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-block">
              <Image src="/logomarcello.svg" alt="Logo" width={64} height={24} className="h-6 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-3 text-sm text-white/60">
              Trova le migliori professioniste di Massaggi, Yoga e Relax vicino a te.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 font-semibold text-white">Link utili</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/professioniste" className="hover:text-[#E91E8C]">Professioniste</Link></li>
              <li><Link href="/#come-funziona" className="hover:text-[#E91E8C]">Come funziona</Link></li>
              <li><Link href="/registrazione" className="hover:text-[#E91E8C]">Iscriviti</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 font-semibold text-white">Legale</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-[#E91E8C]">Privacy Policy</Link></li>
              <li><Link href="/termini" className="hover:text-[#E91E8C]">Termini e condizioni</Link></li>
              <li><Link href="/cookie" className="hover:text-[#E91E8C]">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} Directory Professioniste. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
}
