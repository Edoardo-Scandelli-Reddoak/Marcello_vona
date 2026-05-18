import json
import logging

import stripe
from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professioniste.models import Professionista
from .models import SbloccoSocial, SBLOCCO_SOCIAL_PRICE_CENTS
from .serializers import SbloccoSocialSerializer

logger = logging.getLogger(__name__)


def _stripe_enabled() -> bool:
    return bool(getattr(settings, 'STRIPE_SECRET_KEY', ''))


class SbloccoCheckoutView(APIView):
    """POST { escort_id } -> avvia checkout Stripe per sbloccare i social
    di quella escort. In modalità mock attiva immediatamente lo sblocco.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prof_id = request.data.get('escort_id') or request.data.get('professionista_id')
        if not prof_id:
            return Response({'detail': 'escort_id richiesto'}, status=status.HTTP_400_BAD_REQUEST)

        prof = Professionista.objects.filter(id=prof_id).first()
        if not prof:
            return Response({'detail': 'Escort non trovata'}, status=status.HTTP_404_NOT_FOUND)

        # Se già sbloccato, non serve ricreare
        existing_active = SbloccoSocial.objects.filter(
            user=request.user, professionista=prof, attivo=True
        ).first()
        if existing_active:
            return Response({
                'already_unlocked': True,
                'mock': existing_active.payment_method == 'mock',
                'redirect_url': None,
                'sblocco_id': existing_active.id,
            })

        sblocco = SbloccoSocial.objects.create(
            user=request.user,
            professionista=prof,
            importo_centesimi=SBLOCCO_SOCIAL_PRICE_CENTS,
            attivo=False,
        )

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3001').rstrip('/')

        if not _stripe_enabled():
            sblocco.attivo = True
            sblocco.payment_method = 'mock'
            sblocco.paid_at = timezone.now()
            sblocco.save(update_fields=['attivo', 'payment_method', 'paid_at'])
            return Response({
                'mock': True,
                'redirect_url': f'{frontend_url}/escort/{prof.slug}?social_unlocked=1',
                'sblocco_id': sblocco.id,
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
                            'name': f'Sblocco social — {prof.nome}',
                            'description': 'Accesso permanente ai canali social della scheda',
                        },
                        'unit_amount': SBLOCCO_SOCIAL_PRICE_CENTS,
                    },
                    'quantity': 1,
                }],
                success_url=f'{frontend_url}/escort/{prof.slug}?social_unlocked=1&session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/escort/{prof.slug}?social_cancelled=1',
                metadata={'sblocco_id': str(sblocco.id), 'kind': 'sblocco_social'},
                customer_email=request.user.email or None,
            )
        except stripe.error.StripeError as e:
            sblocco.delete()
            logger.exception('Stripe checkout creation failed (sblocco social)')
            return Response(
                {'detail': f'Errore Stripe: {e.user_message or str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        sblocco.stripe_session_id = session.id
        sblocco.payment_method = 'stripe'
        sblocco.save(update_fields=['stripe_session_id', 'payment_method'])

        return Response({
            'mock': False,
            'redirect_url': session.url,
            'sblocco_id': sblocco.id,
        })


class SbloccoCheckSessionView(APIView):
    """GET ?session_id=… o ?sblocco_id=… → verifica e aggiorna lo stato dello sblocco."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        sblocco_id = request.query_params.get('sblocco_id')

        qs = SbloccoSocial.objects.filter(user=request.user)
        if sblocco_id:
            sblocco = qs.filter(id=sblocco_id).first()
        elif session_id:
            sblocco = qs.filter(stripe_session_id=session_id).first()
        else:
            return Response({'detail': 'session_id o sblocco_id richiesti'}, status=status.HTTP_400_BAD_REQUEST)

        if not sblocco:
            return Response({'detail': 'Sblocco non trovato'}, status=status.HTTP_404_NOT_FOUND)

        if not sblocco.attivo and _stripe_enabled() and sblocco.stripe_session_id:
            try:
                stripe.api_key = settings.STRIPE_SECRET_KEY
                session = stripe.checkout.Session.retrieve(sblocco.stripe_session_id)
                if session.payment_status == 'paid':
                    sblocco.attivo = True
                    sblocco.paid_at = timezone.now()
                    sblocco.stripe_payment_intent_id = session.payment_intent or ''
                    sblocco.save(update_fields=['attivo', 'paid_at', 'stripe_payment_intent_id'])
            except stripe.error.StripeError:
                logger.exception('Stripe retrieve failed (sblocco social)')

        return Response(SbloccoSocialSerializer(sblocco).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    """Webhook Stripe per gli sblocchi social. Riconosce metadata.kind == 'sblocco_social'."""
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
        meta = session.get('metadata') or {}
        if meta.get('kind') == 'sblocco_social' and meta.get('sblocco_id'):
            sblocco = SbloccoSocial.objects.filter(id=meta['sblocco_id'], attivo=False).first()
            if sblocco:
                sblocco.attivo = True
                sblocco.paid_at = timezone.now()
                sblocco.stripe_payment_intent_id = session.get('payment_intent', '') or ''
                sblocco.save(update_fields=['attivo', 'paid_at', 'stripe_payment_intent_id'])

    return Response({'received': True})
