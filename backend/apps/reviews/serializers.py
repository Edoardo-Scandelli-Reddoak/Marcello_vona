from rest_framework import serializers
from .models import Recensione, RecensioneSito


class RecensioneSerializer(serializers.ModelSerializer):
    autore_nome = serializers.SerializerMethodField()
    can_reply = serializers.SerializerMethodField()

    class Meta:
        model = Recensione
        fields = (
            'id', 'stelle', 'testo', 'autore_nome', 'created_at',
            'risposta_escort', 'risposta_at', 'can_reply',
        )
        read_only_fields = (
            'id', 'autore_nome', 'created_at',
            'risposta_at', 'can_reply',
        )

    def get_autore_nome(self, obj):
        if obj.autore.first_name:
            return f"{obj.autore.first_name} {obj.autore.last_name[0]}." if obj.autore.last_name else obj.autore.first_name
        return obj.autore.email.split('@')[0]

    def get_can_reply(self, obj):
        """True solo se l'utente loggato è la escort proprietaria di questa recensione.

        Usato dal frontend per decidere se mostrare il form "rispondi".
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.professionista.user_id == request.user.id


class RecensioneCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recensione
        fields = ('stelle', 'testo')


class RecensioneRispostaSerializer(serializers.ModelSerializer):
    """Serializer dedicato alla risposta della escort (solo testo)."""
    class Meta:
        model = Recensione
        fields = ('risposta_escort',)


class RecensioneSitoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecensioneSito
        fields = ('id', 'nome', 'testo', 'stelle')
