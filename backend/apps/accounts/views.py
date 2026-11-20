from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .serializers import (
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response({
            'user': UserSerializer(user).data,
            'message': 'Registrazione completata con successo.',
        }, status=status.HTTP_201_CREATED)
        response.set_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            value=str(refresh.access_token),
            httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
            max_age=3600,
        )
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
            max_age=7 * 24 * 3600,
        )
        return response


class CookieTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            data = response.data
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=data['access'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                max_age=3600,
            )
            response.set_cookie(
                key='refresh_token',
                value=data['refresh'],
                httponly=True,
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                max_age=7 * 24 * 3600,
            )
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        request.data['refresh'] = request.COOKIES.get('refresh_token', '')
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=response.data['access'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                max_age=3600,
            )
        return response


class LogoutView(APIView):
    def post(self, request):
        response = Response({'message': 'Logout effettuato.'})
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie('refresh_token')
        return response


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


def _primo_errore(errors):
    """Riduce gli errori DRF (dict/list annidati) a un messaggio leggibile,
    così il frontend può mostrarlo così com'è in `detail`."""
    if isinstance(errors, dict):
        for value in errors.values():
            return _primo_errore(value)
    if isinstance(errors, (list, tuple)) and errors:
        return _primo_errore(errors[0])
    return str(errors)


def _imposta_cookie_auth(response, user):
    """Emette nuovi token per `user` e li salva nei cookie come fa il login."""
    refresh = RefreshToken.for_user(user)
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE'],
        value=str(refresh.access_token),
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        max_age=3600,
    )
    response.set_cookie(
        key='refresh_token',
        value=str(refresh),
        httponly=True,
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        max_age=7 * 24 * 3600,
    )
    return response


class PasswordChangeView(APIView):
    """Cambio password dall'area personale: serve la password attuale."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_change'

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _primo_errore(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        response = Response({'message': 'Password aggiornata.'})
        return _imposta_cookie_auth(response, user)


class PasswordResetRequestView(APIView):
    """"Ho dimenticato la password": invia per email un link valido 2 ore.

    Risponde sempre allo stesso modo, che l'email esista o no, per non rivelare
    quali indirizzi sono registrati.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    MESSAGGIO = (
        "Se l'indirizzo è registrato, riceverai a breve un'email con il link "
        'per scegliere una nuova password. Controlla anche lo spam.'
    )

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': 'Inserisci un indirizzo email valido.'}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip()
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if user is not None and user.has_usable_password():
            self._invia_link(user)
        return Response({'message': self.MESSAGGIO})

    def _invia_link(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL.rstrip('/')}/reimposta-password?uid={uid}&token={token}"
        saluto = f'Ciao {user.first_name},' if user.first_name else 'Ciao,'
        corpo = (
            f'{saluto}\n\n'
            'abbiamo ricevuto una richiesta per reimpostare la password del tuo account Escort Bella.\n\n'
            f'Per sceglierne una nuova apri questo link (vale 2 ore):\n{link}\n\n'
            "Se non sei stata tu a chiederlo, ignora questa email: la tua password resta quella di prima.\n\n"
            'Lo staff di Escort Bella'
        )
        try:
            send_mail(
                subject='Reimposta la tua password — Escort Bella',
                message=corpo,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )
        except Exception:
            # L'utente non deve vedere errori diversi (rivelerebbe che l'email
            # esiste): logghiamo e Sentry lo raccoglie.
            logger.exception('Invio email reset password fallito per user %s', user.pk)


class PasswordResetConfirmView(APIView):
    """Imposta la nuova password a partire dal link ricevuto via email."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_confirm'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': _primo_errore(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'message': 'Password reimpostata. Ora puoi accedere con la nuova password.'})
