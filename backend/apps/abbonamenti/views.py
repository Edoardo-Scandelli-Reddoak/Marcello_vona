import json
import logging

import stripe
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professioniste.models import Professionista, EARLY_BIRD_DISCOUNT_PCT, EARLY_BIRD_LIMIT
from .models import PianoAbbonamento, Abbonamento
from .serializers import PianoAbbonamentoSerializer, AbbonamentoSerializer

logger = logging.getLogger(__name__)


def _stripe_enabled() -> bool:
    return bool(getattr(settings, 'STRIPE_SECRET_KEY', ''))


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
                {'detail': 'Devi prima creare il profilo professionista.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount_cents = piano.prezzo_centesimi
        discount_applied = False
        if prof.is_early_bird:
            amount_cents = amount_cents * (100 - EARLY_BIRD_DISCOUNT_PCT) // 100
            discount_applied = True

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
                success_url=f'{frontend_url}/abbonamento/successo?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/abbonamento?cancelled=1',
                metadata={'abbonamento_id': str(abb.id)},
                customer_email=request.user.email or None,
            )
        except stripe.error.StripeError as e:
            abb.stato = 'annullato'
            abb.save(update_fields=['stato'])
            logger.exception('Stripe checkout creation failed')
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
    """Tells the client whether the authenticated professionista qualifies for the
    Early Bird 50% discount (first 10 registered).

    Returns a non-eligible payload for unauthenticated users or non-professionisti.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payload = {
            'early_bird_eligible': False,
            'discount_pct': 0,
            'limit': EARLY_BIRD_LIMIT,
            'remaining_slots': max(0, EARLY_BIRD_LIMIT - Professionista.objects.count()),
        }
        if not request.user.is_authenticated:
            return Response(payload)
        prof = Professionista.objects.filter(user=request.user).first()
        if not prof:
            return Response(payload)
        if prof.is_early_bird:
            payload['early_bird_eligible'] = True
            payload['discount_pct'] = EARLY_BIRD_DISCOUNT_PCT
        return Response(payload)


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
    """Stripe webhook receiver. Activates the related Abbonamento on payment success."""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(status=status.HTTP_400_BAD_REQUEST)
    else:
        try:
            event = json.loads(payload.decode())
        except Exception:
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
