'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfessionistaCard from '@/components/ProfessionistaCard';
import { preferitiApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function DashboardUtentePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [preferiti, setPreferiti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user?.user_type === 'professionista') {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      preferitiApi
        .list()
        .then((data) => setPreferiti(data || []))
        .catch(() => setPreferiti([]))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E91E8C]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Ciao!</h1>
        <p className="mt-1 text-sm text-[#1A1A1A]/60">{user?.email}</p>
      </div>

      <section>
        <div className="mb-6 flex items-center gap-3">
          <Heart className="h-5 w-5 text-[#E91E8C]" fill="#E91E8C" />
          <h2 className="text-xl font-bold text-[#1A1A1A]">I tuoi preferiti</h2>
          <span className="text-sm text-[#1A1A1A]/45">({preferiti.length})</span>
        </div>

        {preferiti.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1A1A1A]/15 bg-white p-10 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-[#1A1A1A]/20" />
            <h3 className="font-semibold text-[#1A1A1A]">Nessun preferito ancora</h3>
            <p className="mt-1 text-sm text-[#1A1A1A]/55">
              Sfoglia le professioniste e clicca il cuoricino per salvarle qui.
            </p>
            <Link href="/professioniste">
              <Button className="mt-4 bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
                Sfoglia professioniste
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {preferiti.map((p) => (
              <ProfessionistaCard key={p.id} professionista={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
