from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.professioniste.models import Professionista
from .models import Recensione, RecensioneSito
from .serializers import (
    RecensioneSerializer,
    RecensioneCreateSerializer,
    RecensioneRispostaSerializer,
    RecensioneSitoSerializer,
)


class RecensioneListView(generics.ListAPIView):
    serializer_class = RecensioneSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        slug = self.kwargs['slug']
        return (
            Recensione.objects
            .filter(professionista__slug=slug)
            .select_related('autore', 'professionista')
        )


class RecensioneCreateView(generics.CreateAPIView):
    serializer_class = RecensioneCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        slug = self.kwargs['slug']
        professionista = Professionista.objects.get(slug=slug, stato_approvazione='approvata')
        serializer.save(autore=self.request.user, professionista=professionista)


class RecensioneRispostaView(generics.UpdateAPIView):
    """Permette alla escort proprietaria di rispondere a una recensione ricevuta.

    PUT/PATCH /api/recensioni/<id>/risposta/ con body { "risposta_escort": "..." }.
    Risposta vuota = cancella la risposta. La risposta è visibile a chiunque
    legga le recensioni del profilo.
    """
    serializer_class = RecensioneRispostaSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['put', 'patch']

    def get_queryset(self):
        # Filtro su ownership: solo le proprie recensioni (cioè quelle ricevute
        # sul proprio profilo) sono modificabili.
        return Recensione.objects.filter(professionista__user=self.request.user)

    def perform_update(self, serializer):
        testo = (serializer.validated_data.get('risposta_escort') or '').strip()
        serializer.save(
            risposta_escort=testo,
            risposta_at=timezone.now() if testo else None,
        )

    def update(self, request, *args, **kwargs):
        # Override per restituire la recensione completa (con autore_nome ecc.)
        # invece del solo campo risposta_escort.
        super().update(request, *args, **kwargs)
        instance = self.get_object()
        return Response(RecensioneSerializer(instance, context={'request': request}).data)


class RecensioneSitoListView(generics.ListAPIView):
    queryset = RecensioneSito.objects.filter(attiva=True)
    serializer_class = RecensioneSitoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
