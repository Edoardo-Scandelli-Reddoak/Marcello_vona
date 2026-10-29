from rest_framework import serializers
from .models import Banner, HeroSettings, SlideBanner


CAMPI_CONTENUTO = ('titolo', 'descrizione', 'immagine', 'link', 'button_testo', 'button_link')


class SlideBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlideBanner
        fields = ('id', *CAMPI_CONTENUTO)


class BannerSerializer(serializers.ModelSerializer):
    slides = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ('id', 'posizione', *CAMPI_CONTENUTO, 'intervallo_secondi', 'slides')

    def get_slides(self, banner):
        attive = banner.slides.filter(attivo=True)
        return SlideBannerSerializer(attive, many=True, context=self.context).data


class HeroSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSettings
        fields = ('titolo', 'sottotitolo', 'immagine')
