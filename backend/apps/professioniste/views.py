import math

from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Professionista, Categoria, Tag
from django.db.models import Count

from .serializers import (
    ProfessionistaCardSerializer,
    ProfessionistaDetailSerializer,
    ProfessionistaCreateSerializer,
    ProfessionistaUpdateSerializer,
    CategoriaSerializer,
    TagSerializer,
    RevealTelefonoSerializer,
    ProvinciaSerializer,
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
        qs = Professionista.objects.filter(stato_approvazione='approvata').select_related('categoria')
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
        qs = list(Professionista.objects.filter(stato_approvazione='approvata').select_related('categoria'))
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
        qs = Professionista.objects.filter(
            stato_approvazione='approvata',
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
        return Professionista.objects.filter(stato_approvazione='approvata').select_related('categoria').prefetch_related('tags', 'galleria')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.visualizzazioni += 1
        instance.save(update_fields=['visualizzazioni'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ProfessionistaCreateView(generics.CreateAPIView):
    serializer_class = ProfessionistaCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProfessionistaDashboardView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfessionistaUpdateSerializer
        return ProfessionistaDetailSerializer

    def get_object(self):
        return Professionista.objects.get(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reveal_telefono(request, slug):
    try:
        p = Professionista.objects.get(slug=slug, stato_approvazione='approvata')
    except Professionista.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    p.click_telefono += 1
    p.save(update_fields=['click_telefono'])
    return Response(RevealTelefonoSerializer(p).data)


class CategoriaListView(generics.ListAPIView):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class TagListView(generics.ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class ProvinceListView(generics.ListAPIView):
    """List of provinces with approved professioniste."""
    serializer_class = ProvinciaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            Professionista.objects
            .filter(stato_approvazione='approvata')
            .values('provincia')
            .annotate(count=Count('id'))
            .order_by('provincia')
        )


class MapProfessionisteView(generics.ListAPIView):
    """All approved professioniste with coordinates for map markers."""
    serializer_class = ProfessionistaCardSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Professionista.objects.filter(
            stato_approvazione='approvata',
            latitudine__isnull=False,
            longitudine__isnull=False,
        ).select_related('categoria')
