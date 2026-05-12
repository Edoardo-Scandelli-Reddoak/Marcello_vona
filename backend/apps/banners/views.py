from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Banner
from .serializers import BannerSerializer


class BannerByPositionView(APIView):
    """Returns the first active banner for a given position, or 404."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, posizione):
        banner = (
            Banner.objects
            .filter(posizione=posizione, attivo=True)
            .order_by('ordine', '-updated_at')
            .first()
        )
        if not banner:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(BannerSerializer(banner, context={'request': request}).data)
