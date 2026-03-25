from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.professioniste.models import Professionista
from .models import Recensione, RecensioneSito
from .serializers import RecensioneSerializer, RecensioneCreateSerializer, RecensioneSitoSerializer


class RecensioneListView(generics.ListAPIView):
    serializer_class = RecensioneSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        slug = self.kwargs['slug']
        return Recensione.objects.filter(professionista__slug=slug).select_related('autore')


class RecensioneCreateView(generics.CreateAPIView):
    serializer_class = RecensioneCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        slug = self.kwargs['slug']
        professionista = Professionista.objects.get(slug=slug, stato_approvazione='approvata')
        serializer.save(autore=self.request.user, professionista=professionista)


class RecensioneSitoListView(generics.ListAPIView):
    queryset = RecensioneSito.objects.filter(attiva=True)
    serializer_class = RecensioneSitoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
