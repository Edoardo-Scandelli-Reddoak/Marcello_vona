from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.professioniste.models import Professionista
from apps.professioniste.serializers import ProfessionistaCardSerializer
from .models import Preferito


class PreferitiListView(generics.ListAPIView):
    """Returns the authenticated user's favorite professioniste, as cards."""
    serializer_class = ProfessionistaCardSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        ids = Preferito.objects.filter(user=self.request.user).values_list('professionista_id', flat=True)
        # Ordering: most-recently favorited first via created_at DESC on Preferito
        return list(
            Professionista.objects
            .visible()
            .filter(id__in=ids)
            .select_related('categoria')
            .order_by('-preferito_da__created_at')
        )


class PreferitoToggleView(APIView):
    """POST: toggle favorite for a given professionista (creates or deletes).
    Returns { is_favorite: bool, count: int }.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, prof_id: int):
        prof = Professionista.objects.filter(id=prof_id).first()
        if not prof:
            return Response({'detail': 'Professionista non trovata'}, status=status.HTTP_404_NOT_FOUND)
        existing = Preferito.objects.filter(user=request.user, professionista=prof).first()
        if existing:
            existing.delete()
            is_favorite = False
        else:
            Preferito.objects.create(user=request.user, professionista=prof)
            is_favorite = True
        return Response({
            'is_favorite': is_favorite,
            'count': prof.preferito_da.count(),
        })
