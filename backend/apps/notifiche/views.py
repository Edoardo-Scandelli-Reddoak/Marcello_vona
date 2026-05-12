from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notifica
from .serializers import NotificaSerializer


class NotificheListView(generics.ListAPIView):
    serializer_class = NotificaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Notifica.objects.filter(user=self.request.user)[:100]


class NotificaLettaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id: int):
        n = Notifica.objects.filter(id=id, user=request.user).first()
        if not n:
            return Response(status=404)
        if not n.letta:
            n.letta = True
            n.read_at = timezone.now()
            n.save(update_fields=['letta', 'read_at'])
        return Response({'ok': True})


class NotificheLeggiTutteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notifica.objects.filter(user=request.user, letta=False).update(
            letta=True, read_at=timezone.now()
        )
        return Response({'ok': True})
