from rest_framework import serializers
from .models import PianoAbbonamento, Abbonamento


class PianoAbbonamentoSerializer(serializers.ModelSerializer):
    prezzo_eur = serializers.FloatField(read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = PianoAbbonamento
        fields = ('id', 'tipo', 'tipo_display', 'nome', 'durata_giorni', 'prezzo_centesimi', 'prezzo_eur', 'ordine')


class AbbonamentoSerializer(serializers.ModelSerializer):
    piano = PianoAbbonamentoSerializer(read_only=True)
    importo_eur = serializers.FloatField(read_only=True)
    is_attivo = serializers.BooleanField(read_only=True)
    stato_display = serializers.CharField(source='get_stato_display', read_only=True)

    class Meta:
        model = Abbonamento
        fields = (
            'id', 'piano', 'stato', 'stato_display',
            'importo_centesimi', 'importo_eur',
            'inizio', 'scadenza', 'is_attivo',
            'payment_method', 'created_at', 'paid_at',
        )
