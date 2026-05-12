from rest_framework import serializers
from .models import Banner


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = (
            'id', 'posizione', 'titolo', 'descrizione',
            'immagine', 'button_testo', 'button_link',
        )
