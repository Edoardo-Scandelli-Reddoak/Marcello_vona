'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User, LogOut } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: '/escort', label: 'Le nostre escort' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#F8F7F5]/95 backdrop-blur supports-[backdrop-filter]:bg-[#F8F7F5]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo + Nav together */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/escortbella.svg"
              alt="Escort Bella"
              width={280}
              height={35}
              className="h-7 w-auto max-w-[min(55vw,260px)] sm:max-w-[300px]"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#1A1A1A]/70 transition-colors hover:text-[#1A1A1A]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Accedi</Button>
              </Link>
              <Link href="/registrati">
                <Button size="sm" className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
                  Registrati
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-[#F8F7F5]">
            <div className="flex flex-col gap-4 pt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium text-[#1A1A1A]"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-[#1A1A1A]/10" />
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={() => { logout(); setOpen(false); }} className="text-left text-[#1A1A1A]/70">
                    Esci
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)}>Accedi</Link>
                  <Link href="/registrati" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
                      Registrati
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
