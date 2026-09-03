import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professioniste.models import Professionista
from .models import PianoAbbonamento, Abbonamento, Promozione, CodicePromo
from .serializers import PianoAbbonamentoSerializer, AbbonamentoSerializer

logger = logging.getLogger(__name__)


def prezzo_scontato(piano: PianoAbbonamento, codice_input: str = ''):
    """Calcola l'importo da concordare per un piano.

    Priorita': codice referral valido > Promozione globale > prezzo pieno.
    I due sconti non si sommano mai. Ritorna (importo_centesimi, sorgente),
    dove sorgente e' None, 'codice' o 'promo_generale'.
    """
    amount = piano.prezzo_centesimi
    codice_promo = CodicePromo.find_active(codice_input) if codice_input else None
    if codice_promo and codice_promo.sconto_percentuale > 0:
        return amount * (100 - codice_promo.sconto_percentuale) // 100, 'codice'
    if Promozione.get_current() is not None and piano.sconto_percentuale > 0:
        return amount * (100 - piano.sconto_percentuale) // 100, 'promo_generale'
    return amount, None


class PianiListView(generics.ListAPIView):
    """Elenco pubblico dei piani attivi."""
    serializer_class = PianoAbbonamentoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return PianoAbbonamento.objects.filter(attivo=True)


class RichiestaAttivazioneView(APIView):
    """Registra la richiesta di attivazione di un piano.

    Il pagamento non passa dal sito: la escort sceglie il piano e poi scrive su
    WhatsApp, dove si concorda tutto. Questa view esiste solo per lasciare
    all'admin una traccia di *cosa* ha chiesto e a *quale prezzo*, cosi'
    l'attivazione dal pannello e' un clic e il fatturato resta corretto.

    NON attiva nulla: crea (o riusa) un Abbonamento in stato 'in_attesa'.
    L'attivazione e' un'azione manuale dell'admin, dopo il pagamento.

    POST { piano_id, codice_promo? } -> { abbonamento_id, importo_centesimi }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        piano_id = request.data.get('piano_id')
        if not piano_id:
            return Response({'detail': 'piano_id richiesto'}, status=status.HTTP_400_BAD_REQUEST)

        piano = PianoAbbonamento.objects.filter(id=piano_id, attivo=True).first()
        if not piano:
            return Response({'detail': 'Piano non trovato o non attivo'}, status=status.HTTP_404_NOT_FOUND)

        prof = Professionista.objects.filter(user=request.user).first()
        if not prof:
            return Response(
                {'detail': 'Devi prima creare la tua scheda escort.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        codice_input = (request.data.get('codice_promo') or '').strip()
        amount_cents, discount_source = prezzo_scontato(piano, codice_input)

        # Riusa la richiesta pendente per lo stesso piano invece di accumulare
        # duplicati se la escort clicca piu' volte prima di essere attivata.
        abb = Abbonamento.objects.filter(
            professionista=prof, piano=piano, stato='in_attesa',
        ).order_by('-created_at').first()
        if abb:
            if abb.importo_centesimi != amount_cents:
                abb.importo_centesimi = amount_cents
                abb.save(update_fields=['importo_centesimi'])
        else:
            abb = Abbonamento.objects.create(
                professionista=prof,
                piano=piano,
                importo_centesimi=amount_cents,
                stato='in_attesa',
                payment_method='manuale',
            )

        return Response({
            'abbonamento_id': abb.id,
            'importo_centesimi': amount_cents,
            'discount_applied': discount_source is not None,
            'discount_source': discount_source,
        }, status=status.HTTP_201_CREATED)


class DiscountInfoView(APIView):
    """Stato della Promozione Early Bird globale.

    Pubblica anche per gli anonimi: la pagina prezzi mostra il countdown
    prima del login.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        promo = Promozione.get_current()
        if promo is None:
            return Response({'attiva': False, 'scadenza': None, 'nome': ''})
        return Response({
            'attiva': True,
            'scadenza': promo.scadenza.isoformat(),
            'nome': promo.nome,
        })


class CodicePromoValidateView(APIView):
    """Verifica un codice referral. Ritorna 200 + valido=False se non vale,
    cosi' il client mostra il banner solo quando c'e' davvero uno sconto.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, codice):
        promo = CodicePromo.find_active(codice)
        if promo is None:
            return Response({'valido': False}, status=status.HTTP_200_OK)
        return Response({
            'valido': True,
            'codice': promo.codice,
            'nome': promo.nome,
            'sconto_percentuale': promo.sconto_percentuale,
            'scadenza': promo.scadenza.isoformat() if promo.scadenza else None,
        })


class MyAbbonamentiView(generics.ListAPIView):
    """Storico abbonamenti della scheda dell'utente autenticato."""
    serializer_class = AbbonamentoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Abbonamento.objects.filter(
            professionista__user=self.request.user
        ).select_related('piano')
