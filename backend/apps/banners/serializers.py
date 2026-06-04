from rest_framework import serializers
from .models import Banner, HeroSettings


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = (
            'id', 'posizione', 'titolo', 'descrizione',
            'immagine', 'button_testo', 'button_link',
        )


class HeroSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSettings
        fields = ('titolo', 'sottotitolo', 'immagine')
