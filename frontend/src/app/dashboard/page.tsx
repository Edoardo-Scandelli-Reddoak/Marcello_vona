'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/StarRating';
import { professionisteApi, recensioniApi, mediaUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Eye, Phone, Edit2, Save } from 'lucide-react';

const statusBadge: Record<string, { label: string; className: string }> = {
  in_attesa: { label: 'In attesa di verifica', className: 'bg-yellow-100 text-yellow-800' },
  approvata: { label: 'Approvata', className: 'bg-green-100 text-green-800' },
  rifiutata: { label: 'Rifiutata', className: 'bg-red-100 text-red-800' },
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profilo, setProfilo] = useState<any>(null);
  const [recensioni, setRecensioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ nome: '', bio: '', telefono: '', citta: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user?.user_type !== 'professionista') {
      router.push('/');
      return;
    }
    if (user) {
      professionisteApi.dashboard()
        .then((data) => {
          setProfilo(data);
          setEditData({ nome: data.nome, bio: data.bio, telefono: data.telefono || '', citta: data.citta });
          if (data.slug) {
            recensioniApi.list(data.slug).then(setRecensioni).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="py-20 text-center text-[#1A1A1A]/40">Caricamento...</div>;
  }

  if (!profilo) {
    return <div className="py-20 text-center text-[#1A1A1A]/40">Profilo non trovato.</div>;
  }

  const status = statusBadge[profilo.stato] || statusBadge.in_attesa;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Dashboard</h1>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      {/* Profile Card */}
      <div className="mb-8 rounded-2xl border border-[#1A1A1A]/10 bg-white p-6">
        <div className="flex items-start gap-6">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src={mediaUrl(profilo.foto_profilo)}
              alt={profilo.nome}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Telefono</Label>
                  <Input value={editData.telefono} onChange={(e) => setEditData({ ...editData, telefono: e.target.value })} />
                </div>
                <div>
                  <Label>Città</Label>
                  <Input value={editData.citta} onChange={(e) => setEditData({ ...editData, citta: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setEditing(false)} variant="outline">Annulla</Button>
                  <Button
                    onClick={async () => {
                      const fd = new FormData();
                      Object.entries(editData).forEach(([k, v]) => fd.append(k, v));
                      try {
                        const updated = await professionisteApi.updateDashboard(fd);
                        setProfilo(updated);
                        setEditing(false);
                      } catch {}
                    }}
                    className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
                  >
                    <Save className="mr-2 h-4 w-4" /> Salva
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{profilo.nome}</h2>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-sm text-[#1A1A1A]/60">{profilo.categoria_nome}</p>
                <p className="mt-2 text-sm text-[#1A1A1A]/70">{profilo.bio}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-5 text-center">
          <Eye className="mx-auto mb-2 h-6 w-6 text-[#E91E8C]" />
          <p className="text-2xl font-bold">{profilo.visualizzazioni || 0}</p>
          <p className="text-xs text-[#1A1A1A]/60">Visualizzazioni</p>
        </div>
        <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-5 text-center">
          <Phone className="mx-auto mb-2 h-6 w-6 text-[#E91E8C]" />
          <p className="text-2xl font-bold">{profilo.click_telefono || 0}</p>
          <p className="text-xs text-[#1A1A1A]/60">Click telefono</p>
        </div>
        <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-5 text-center">
          <div className="mx-auto mb-2 flex justify-center">
            <StarRating value={Math.round(profilo.rating || 0)} readonly size="sm" />
          </div>
          <p className="text-2xl font-bold">{profilo.rating || 0}</p>
          <p className="text-xs text-[#1A1A1A]/60">{profilo.numero_recensioni || 0} recensioni</p>
        </div>
      </div>

      {/* Reviews */}
      <h2 className="mb-4 text-xl font-bold text-[#1A1A1A]">Recensioni ricevute</h2>
      <div className="space-y-3">
        {recensioni.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-[#1A1A1A]/10 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">{r.autore_nome}</span>
              <span className="text-xs text-[#1A1A1A]/40">
                {new Date(r.created_at).toLocaleDateString('it-IT')}
              </span>
            </div>
            <StarRating value={r.stelle} readonly size="sm" />
            <p className="mt-1 text-sm text-[#1A1A1A]/70">{r.testo}</p>
          </div>
        ))}
        {recensioni.length === 0 && (
          <p className="text-[#1A1A1A]/40">Nessuna recensione ancora.</p>
        )}
      </div>
    </div>
  );
}
