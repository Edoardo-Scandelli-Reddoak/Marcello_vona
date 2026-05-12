from rest_framework import serializers
from .models import SbloccoSocial


class SbloccoSocialSerializer(serializers.ModelSerializer):
    importo_eur = serializers.FloatField(read_only=True)

    class Meta:
        model = SbloccoSocial
        fields = (
            'id', 'professionista', 'attivo',
            'importo_centesimi', 'importo_eur',
            'payment_method', 'paid_at', 'created_at',
        )
