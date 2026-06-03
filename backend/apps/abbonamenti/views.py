import json
import logging

import stripe
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professioniste.models import Professionista
from .models import PianoAbbonamento, Abbonamento, Promozione, CodicePromo
from .serializers import PianoAbbonamentoSerializer, AbbonamentoSerializer

logger = logging.getLogger(__name__)


def _stripe_enabled() -> bool:
    return bool(getattr(settings, 'STRIPE_SECRET_KEY', ''))


def construct_stripe_event(request):
    """Verifica e ritorna l'evento Stripe dal payload del webhook.

    - STRIPE_WEBHOOK_SECRET settato → verifica la firma HMAC; firma non valida → None.
    - NON settato → in DEBUG accetta il payload non firmato (test locali con
      stripe-cli); in produzione RIFIUTA (fail-closed) per non accettare
      webhook falsificabili.

    Ritorna l'evento (oggetto Stripe o dict) oppure None se va rifiutato:
    il chiamante in quel caso risponde 400.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

    if webhook_secret:
        try:
            return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError):
            logger.warning('Webhook Stripe con firma non valida: rifiutato.')
            return None

    if not settings.DEBUG:
        logger.error(
            'Webhook Stripe ricevuto senza STRIPE_WEBHOOK_SECRET in produzione: '
            'rifiutato (impossibile verificare la firma).'
        )
        return None

    try:
        return json.loads(payload.decode())
    except Exception:
        return None


class PianiListView(generics.ListAPIView):
    """Returns all active subscription plans, public."""
    serializer_class = PianoAbbonamentoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return PianoAbbonamento.objects.filter(attivo=True)


class CheckoutCreateView(APIView):
    """Creates a Stripe checkout session for the given piano_id, or activates a mock subscription
    if Stripe is not configured.

    POST { piano_id }  -> { redirect_url, abbonamento_id, mock }
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

        # Sconto: priorità al codice del link se presente e valido, altrimenti
        # fallback sulla Promozione globale. I due non si sommano mai.
        amount_cents = piano.prezzo_centesimi
        discount_applied = False
        discount_source = None
        codice_input = (request.data.get('codice_promo') or '').strip()
        codice_promo = CodicePromo.find_active(codice_input) if codice_input else None
        if codice_promo and codice_promo.sconto_percentuale > 0:
            amount_cents = amount_cents * (100 - codice_promo.sconto_percentuale) // 100
            discount_applied = True
            discount_source = 'codice'
        elif Promozione.get_current() is not None and piano.sconto_percentuale > 0:
            amount_cents = amount_cents * (100 - piano.sconto_percentuale) // 100
            discount_applied = True
            discount_source = 'promo_generale'

        abb = Abbonamento.objects.create(
            professionista=prof,
            piano=piano,
            importo_centesimi=amount_cents,
            stato='in_attesa',
        )

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3001').rstrip('/')

        if not _stripe_enabled():
            # Mock mode: activate immediately for local development.
            abb.activate(payment_method='mock')
            return Response({
                'mock': True,
                'redirect_url': f'{frontend_url}/abbonamento/successo?abbonamento_id={abb.id}&mock=true',
                'abbonamento_id': abb.id,
                'discount_applied': discount_applied,
                'amount_cents': amount_cents,
            })

        stripe.api_key = settings.STRIPE_SECRET_KEY
        success_url = f'{frontend_url}/abbonamento/successo?session_id={{CHECKOUT_SESSION_ID}}'
        cancel_url = f'{frontend_url}/abbonamento?cancelled=1'
        try:
            session = stripe.checkout.Session.create(
                mode='payment',
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': f'{piano.get_tipo_display()} — {piano.nome}'
                                    + (' (sconto Early Bird -50%)' if discount_applied else ''),
                            'description': f'Durata: {piano.durata_giorni} giorni',
                        },
                        'unit_amount': amount_cents,
                    },
                    'quantity': 1,
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={'abbonamento_id': str(abb.id)},
                customer_email=request.user.email or None,
            )
        except stripe.error.StripeError as e:
            abb.stato = 'annullato'
            abb.save(update_fields=['stato'])
            logger.exception(
                'Stripe checkout creation failed (success_url=%r, cancel_url=%r)',
                success_url, cancel_url,
            )
            return Response(
                {'detail': f'Errore Stripe: {e.user_message or str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        abb.stripe_session_id = session.id
        abb.payment_method = 'stripe'
        abb.save(update_fields=['stripe_session_id', 'payment_method'])

        return Response({
            'mock': False,
            'redirect_url': session.url,
            'abbonamento_id': abb.id,
            'discount_applied': discount_applied,
            'amount_cents': amount_cents,
        })


class CheckSessionView(APIView):
    """Confirms whether an Abbonamento has been paid. Used by the success page after redirect."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        abb_id = request.query_params.get('abbonamento_id')

        qs = Abbonamento.objects.filter(professionista__user=request.user)
        if abb_id:
            abb = qs.filter(id=abb_id).first()
        elif session_id:
            abb = qs.filter(stripe_session_id=session_id).first()
        else:
            return Response(
                {'detail': 'session_id o abbonamento_id richiesti'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not abb:
            return Response({'detail': 'Abbonamento non trovato'}, status=status.HTTP_404_NOT_FOUND)

        # If still pending and Stripe is configured, ask Stripe directly.
        if abb.stato == 'in_attesa' and _stripe_enabled() and abb.stripe_session_id:
            try:
                stripe.api_key = settings.STRIPE_SECRET_KEY
                session = stripe.checkout.Session.retrieve(abb.stripe_session_id)
                if session.payment_status == 'paid':
                    abb.activate(
                        payment_method='stripe',
                        stripe_payment_intent_id=session.payment_intent or '',
                    )
            except stripe.error.StripeError:
                logger.exception('Stripe session retrieve failed')

        return Response(AbbonamentoSerializer(abb).data)


class DiscountInfoView(APIView):
    """Stato della Promozione Early Bird globale.

    Pubblica (anche per anonimi) perché la pagina prezzi mostra il countdown
    anche prima del login. Lo sconto per piano viene letto dal serializer di
    PianoAbbonamento (campo `sconto_percentuale`).
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
    """Verifica un codice sconto da link `/?promo=<codice>/`.

    Endpoint pubblico: il frontend lo chiama appena cattura il `promo` query
    param, per decidere se mostrare il banner sconto. Ritorna 200+valido=False
    se non esiste/non è attivo/è scaduto (così il client mostra solo se
    valido, senza popup d'errore).
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
    """Returns the authenticated user's subscription history."""
    serializer_class = AbbonamentoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Abbonamento.objects.filter(professionista__user=self.request.user).select_related('piano')


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    """Stripe webhook receiver. Activates the related Abbonamento on payment success.

    NOTA: endpoint legacy mantenuto per backward compatibility. Per i nuovi setup
    è preferibile `stripe_webhook_unified` (vedi `/api/stripe/webhook/`) che gestisce
    sia abbonamenti che sblocchi social con un solo webhook configurato su Stripe.
    """
    event = construct_stripe_event(request)
    if event is None:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    if event.get('type') == 'checkout.session.completed':
        session = event['data']['object']
        abb_id = (session.get('metadata') or {}).get('abbonamento_id')
        if abb_id:
            abb = Abbonamento.objects.filter(id=abb_id, stato='in_attesa').first()
            if abb:
                abb.activate(
                    payment_method='stripe',
                    stripe_payment_intent_id=session.get('payment_intent', '') or '',
                )

    return Response({'received': True})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def stripe_webhook_unified(request):
    """Webhook Stripe unificato — gestisce sia abbonamenti che sblocchi social.

    Configurare UN SOLO webhook su Stripe Dashboard puntato a
    `/api/stripe/webhook/`, evento `checkout.session.completed`.
    Lo smistamento avviene leggendo `session.metadata.kind`:
    - `sblocco_social` → attiva il record `SbloccoSocial`
    - default (abbonamento_id presente) → attiva l'`Abbonamento`
    """
    from apps.sblocchi.models import SbloccoSocial  # lazy import per evitare cicli

    event = construct_stripe_event(request)
    if event is None:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    if event.get('type') == 'checkout.session.completed':
        session = event['data']['object']
        meta = session.get('metadata') or {}
        payment_intent = session.get('payment_intent', '') or ''

        if meta.get('kind') == 'sblocco_social' and meta.get('sblocco_id'):
            sblocco = SbloccoSocial.objects.filter(id=meta['sblocco_id'], attivo=False).first()
            if sblocco:
                sblocco.attivo = True
                sblocco.paid_at = timezone.now()
                sblocco.stripe_payment_intent_id = payment_intent
                sblocco.save(update_fields=['attivo', 'paid_at', 'stripe_payment_intent_id'])
        elif meta.get('abbonamento_id'):
            abb = Abbonamento.objects.filter(id=meta['abbonamento_id'], stato='in_attesa').first()
            if abb:
                abb.activate(
                    payment_method='stripe',
                    stripe_payment_intent_id=payment_intent,
                )

    return Response({'received': True})
