from rest_framework import serializers
from .models import Recensione, RecensioneSito


class RecensioneSerializer(serializers.ModelSerializer):
    autore_nome = serializers.SerializerMethodField()

    class Meta:
        model = Recensione
        fields = ('id', 'stelle', 'testo', 'autore_nome', 'created_at')
        read_only_fields = ('id', 'autore_nome', 'created_at')

    def get_autore_nome(self, obj):
        if obj.autore.first_name:
            return f"{obj.autore.first_name} {obj.autore.last_name[0]}." if obj.autore.last_name else obj.autore.first_name
        return obj.autore.email.split('@')[0]


class RecensioneCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recensione
        fields = ('stelle', 'testo')


class RecensioneSitoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecensioneSito
        fields = ('id', 'nome', 'testo', 'stelle')
