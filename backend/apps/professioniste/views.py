import math

from django.utils import timezone
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from django.db import models
from django.db.models import Case, Count, IntegerField, Value, When
from .models import (
    Professionista, Categoria, Tag,
    VideoProfessionista, MAX_VIDEO_PER_ESCORT,
    PAUSA_COOLDOWN_DAYS,
)
from .geocoding import geocode_address
from .serializers import (
    ProfessionistaCardSerializer,
    ProfessionistaDetailSerializer,
    ProfessionistaCreateSerializer,
    ProfessionistaUpdateSerializer,
    CategoriaSerializer,
    TagSerializer,
    RevealTelefonoSerializer,
    ProvinciaSerializer,
    VideoSerializer,
)
from .filters import ProfessionistaFilter


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class ProfessionistaListView(generics.ListAPIView):
    serializer_class = ProfessionistaCardSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProfessionistaFilter
    search_fields = ['nome', 'bio', 'tags__nome']
    ordering_fields = ['created_at']

    def get_queryset(self):
        qs = Professionista.objects.visible().select_related('categoria')
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        distance = self.request.query_params.get('distanza')
        ordering = self.request.query_params.get('ordering')

        if lat and lng:
            lat, lng = float(lat), float(lng)
            if distance:
                max_dist = float(distance)
                filtered_ids = []
                for p in qs.filter(latitudine__isnull=False, longitudine__isnull=False):
                    d = haversine_distance(lat, lng, p.latitudine, p.longitudine)
                    if d <= max_dist:
                        filtered_ids.append(p.id)
                qs = qs.filter(id__in=filtered_ids)

        if ordering == 'rating':
            qs = sorted(qs, key=lambda p: p.rating_medio, reverse=True)
            return qs
        if ordering == 'distanza' and lat and lng:
            lat, lng = float(lat), float(lng)
            qs_list = list(qs.filter(latitudine__isnull=False, longitudine__isnull=False))
            qs_list.sort(key=lambda p: haversine_distance(lat, lng, p.latitudine, p.longitudine))
            return qs_list

        return qs


class ProfessionistaFeaturedView(generics.ListAPIView):
    """Le più apprezzate - ordinate per rating."""
    serializer_class = ProfessionistaCardSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = list(Professionista.objects.featured_evidenza().select_related('categoria'))
        qs.sort(key=lambda p: p.rating_medio, reverse=True)
        return qs[:12]


class ProfessionistaNearbyView(generics.ListAPIView):
    """Vicino a te - ordinate per distanza."""
    serializer_class = ProfessionistaCardSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        qs = Professionista.objects.visible().filter(
            latitudine__isnull=False,
            longitudine__isnull=False,
        ).select_related('categoria')

        if lat and lng:
            lat, lng = float(lat), float(lng)
            qs_list = list(qs)
            qs_list.sort(key=lambda p: haversine_distance(lat, lng, p.latitudine, p.longitudine))
            return qs_list[:12]
        return qs.order_by('-created_at')[:12]


class ProfessionistaDetailView(generics.RetrieveAPIView):
    serializer_class = ProfessionistaDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Professionista.objects.visible().select_related('categoria').prefetch_related('tags', 'galleria')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ProfessionistaCreateView(generics.CreateAPIView):
    serializer_class = ProfessionistaCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class MiTrovoQuiView(APIView):
    """Quick-edit endpoint for the public address: the prof types a free-form address,
    Nominatim geocodes it, and the result REPLACES the public address (via, cap, citta,
    provincia, nazione, latitudine, longitudine).

    POST { indirizzo: str } -> updates and returns the new public address.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_profilo(self, request):
        return Professionista.objects.filter(user=request.user).first()

    def post(self, request):
        prof = self._get_profilo(request)
        if not prof:
            return Response({'detail': 'Profilo non trovato'}, status=status.HTTP_404_NOT_FOUND)

        indirizzo = (request.data.get('indirizzo') or '').strip()
        if not indirizzo:
            return Response({'detail': 'Indirizzo richiesto'}, status=status.HTTP_400_BAD_REQUEST)

        geo = geocode_address(indirizzo)
        if not geo:
            return Response(
                {'detail': 'Indirizzo non riconosciuto. Prova ad essere più specifica (es. "Via Roma 42, Milano").'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Compose a clean "via" string from the original input (preserve user formatting)
        # while overwriting the structured fields and lat/lng with geocoded values.
        addr = geo.get('address') or {}
        prof.via = indirizzo
        prof.citta = geo['citta'] or prof.citta
        prof.cap = addr.get('postcode', prof.cap) or prof.cap
        # Provincia: leave as-is unless we can guess it (Nominatim sometimes returns county)
        prof.nazione = addr.get('country', prof.nazione) or prof.nazione
        prof.latitudine = geo['lat']
        prof.longitudine = geo['lng']
        prof.indirizzo_pubblico_aggiornato_at = timezone.now()
        prof.save(update_fields=[
            'via', 'citta', 'cap', 'nazione', 'latitudine', 'longitudine',
            'indirizzo_pubblico_aggiornato_at',
        ])

        return Response({
            'via': prof.via,
            'cap': prof.cap,
            'citta': prof.citta,
            'provincia': prof.provincia,
            'nazione': prof.nazione,
            'lat': prof.latitudine,
            'lng': prof.longitudine,
            'aggiornato_at': prof.indirizzo_pubblico_aggiornato_at,
        })


class ProfessionistaDashboardView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/PUT/DELETE sulla propria scheda.

    DELETE rimuove definitivamente la scheda (Professionista). L'utente resta,
    ma viene riportato a `user_type='user'` così può navigare il sito o iscriversi
    di nuovo in futuro.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfessionistaUpdateSerializer
        return ProfessionistaDetailSerializer

    def get_object(self):
        return Professionista.objects.get(user=self.request.user)

    def perform_destroy(self, instance):
        user = instance.user
        instance.delete()
        # Riporta l'account a tipo "user" così l'utente può continuare a usare il sito
        # come visitatore (o iscriversi di nuovo).
        if user.user_type == 'escort':
            user.user_type = 'user'
            user.save(update_fields=['user_type'])


class PausaSchedaView(APIView):
    """Mette in pausa o riattiva la propria scheda.

    POST { "in_pausa": true } per sospendere; POST { "in_pausa": false } per riattivare.
    Limite: massimo una pausa ogni PAUSA_COOLDOWN_DAYS giorni. Se è troppo presto per
    una nuova pausa, restituisce 400 con la data della prossima disponibilità.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prof = Professionista.objects.filter(user=request.user).first()
        if not prof:
            return Response({'detail': 'Profilo non trovato'}, status=status.HTTP_404_NOT_FOUND)

        target = bool(request.data.get('in_pausa'))

        if target and not prof.in_pausa:
            # Attivazione pausa: controllo cooldown
            next_at = prof.prossima_pausa_disponibile_at
            if next_at is not None:
                return Response(
                    {
                        'detail': (
                            'Hai già usato la pausa di questo mese. '
                            f'Potrai mettere di nuovo in pausa la scheda dal '
                            f'{next_at.strftime("%d/%m/%Y")}.'
                        ),
                        'prossima_pausa_disponibile_at': next_at,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            prof.in_pausa = True
            prof.pausa_iniziata_at = timezone.now()
            prof.save(update_fields=['in_pausa', 'pausa_iniziata_at'])
        elif not target and prof.in_pausa:
            # Riattivazione: lasciamo invariato pausa_iniziata_at per il cooldown
            prof.in_pausa = False
            prof.save(update_fields=['in_pausa'])

        return Response({
            'in_pausa': prof.in_pausa,
            'pausa_iniziata_at': prof.pausa_iniziata_at,
            'prossima_pausa_disponibile_at': prof.prossima_pausa_disponibile_at,
            'cooldown_giorni': PAUSA_COOLDOWN_DAYS,
        })


class VideoListCreateView(APIView):
    """Gestione video dalla dashboard.

    GET  → elenco dei propri video
    POST → carica un nuovo video (multipart "video"). Rifiuta se sono già MAX_VIDEO_PER_ESCORT.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _profilo(self, request):
        return Professionista.objects.filter(user=request.user).first()

    def get(self, request):
        prof = self._profilo(request)
        if not prof:
            return Response({'detail': 'Profilo non trovato'}, status=status.HTTP_404_NOT_FOUND)
        return Response(VideoSerializer(prof.video.all(), many=True).data)

    def post(self, request):
        prof = self._profilo(request)
        if not prof:
            return Response({'detail': 'Profilo non trovato'}, status=status.HTTP_404_NOT_FOUND)
        if prof.video.count() >= MAX_VIDEO_PER_ESCORT:
            return Response(
                {'detail': f'Hai raggiunto il limite di {MAX_VIDEO_PER_ESCORT} video.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        video_file = request.FILES.get('video')
        if not video_file:
            return Response({'detail': 'File video mancante.'}, status=status.HTTP_400_BAD_REQUEST)
        ordine = (prof.video.aggregate(m=models.Max('ordine'))['m'] or -1) + 1
        v = VideoProfessionista.objects.create(professionista=prof, video=video_file, ordine=ordine)
        return Response(VideoSerializer(v).data, status=status.HTTP_201_CREATED)


class VideoDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        prof = Professionista.objects.filter(user=request.user).first()
        if not prof:
            return Response({'detail': 'Profilo non trovato'}, status=status.HTTP_404_NOT_FOUND)
        v = prof.video.filter(pk=pk).first()
        if not v:
            return Response(status=status.HTTP_404_NOT_FOUND)
        v.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reveal_telefono(request, slug):
    p = Professionista.objects.visible().filter(slug=slug).first()
    if not p:
        return Response(status=status.HTTP_404_NOT_FOUND)
    p.click_telefono += 1
    p.save(update_fields=['click_telefono'])
    return Response(RevealTelefonoSerializer(p).data)


class CategoriaListView(generics.ListAPIView):
    queryset = Categoria.objects.annotate(
        _ord=Case(
            When(nome__in=['donna', 'massaggi'], then=Value(0)),
            When(nome__in=['trans', 'yoga'], then=Value(1)),
            When(nome__in=['coppia', 'relax'], then=Value(2)),
            default=Value(3),
            output_field=IntegerField(),
        )
    ).order_by('_ord')
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class TagListView(generics.ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class ProvinceListView(generics.ListAPIView):
    """List of provinces with approved escort."""
    serializer_class = ProvinciaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            Professionista.objects
            .visible()
            .values('provincia')
            .annotate(count=Count('id'))
            .order_by('provincia')
        )


class MapEscortView(generics.ListAPIView):
    """All approved escort with coordinates for map markers."""
    serializer_class = ProfessionistaCardSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Professionista.objects.visible().filter(
            latitudine__isnull=False,
            longitudine__isnull=False,
        ).select_related('categoria')
