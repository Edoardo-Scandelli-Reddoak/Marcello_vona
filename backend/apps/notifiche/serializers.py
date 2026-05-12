from rest_framework import serializers
from .models import Notifica


class NotificaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Notifica
        fields = ('id', 'tipo', 'tipo_display', 'titolo', 'messaggio', 'link', 'letta', 'created_at', 'read_at')
        read_only_fields = fields
