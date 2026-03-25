from rest_framework import serializers
from .models import Professionista, FotoProfessionista, Categoria, Tag


class CategoriaSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='get_nome_display', read_only=True)

    class Meta:
        model = Categoria
        fields = ('id', 'nome', 'label')


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'nome')


class FotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoProfessionista
        fields = ('id', 'immagine', 'ordine')


class ProfessionistaCardSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.get_nome_display', read_only=True)
    categoria_slug = serializers.CharField(source='categoria.nome', read_only=True)
    rating = serializers.FloatField(source='rating_medio', read_only=True)
    numero_recensioni = serializers.IntegerField(read_only=True)

    class Meta:
        model = Professionista
        fields = (
            'id', 'nome', 'slug', 'foto_profilo',
            'categoria_nome', 'categoria_slug',
            'citta', 'provincia', 'latitudine', 'longitudine',
            'rating', 'numero_recensioni',
        )


class ProfessionistaDetailSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.get_nome_display', read_only=True)
    categoria_slug = serializers.CharField(source='categoria.nome', read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    galleria = FotoSerializer(many=True, read_only=True)
    rating = serializers.FloatField(source='rating_medio', read_only=True)
    numero_recensioni = serializers.IntegerField(read_only=True)
    indirizzo_completo = serializers.SerializerMethodField()

    class Meta:
        model = Professionista
        fields = (
            'id', 'nome', 'slug', 'bio', 'foto_profilo',
            'categoria_nome', 'categoria_slug',
            'tags', 'via', 'cap', 'citta', 'provincia', 'nazione',
            'indirizzo_completo',
            'latitudine', 'longitudine',
            'galleria', 'rating', 'numero_recensioni',
            'visualizzazioni',
        )

    def get_indirizzo_completo(self, obj):
        parts = [obj.via, f'{obj.cap} {obj.citta} ({obj.provincia})']
        if obj.nazione and obj.nazione != 'Italia':
            parts.append(obj.nazione)
        return ', '.join(filter(None, parts))


class ProfessionistaCreateSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(many=True, queryset=Tag.objects.all(), required=False)
    galleria = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Professionista
        fields = (
            'nome', 'categoria', 'tags', 'bio', 'telefono',
            'via', 'cap', 'citta', 'provincia', 'nazione',
            'latitudine', 'longitudine',
            'foto_profilo', 'documento_fronte', 'documento_retro',
            'privacy_accettata', 'termini_accettati', 'galleria',
        )

    def create(self, validated_data):
        galleria_images = validated_data.pop('galleria', [])
        tags = validated_data.pop('tags', [])
        professionista = Professionista.objects.create(
            user=self.context['request'].user,
            **validated_data
        )
        professionista.tags.set(tags)
        for i, img in enumerate(galleria_images):
            FotoProfessionista.objects.create(
                professionista=professionista,
                immagine=img,
                ordine=i,
            )
        user = self.context['request'].user
        user.user_type = 'professionista'
        user.save()
        return professionista


class ProfessionistaUpdateSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(many=True, queryset=Tag.objects.all(), required=False)

    class Meta:
        model = Professionista
        fields = (
            'nome', 'categoria', 'tags', 'bio', 'telefono',
            'via', 'cap', 'citta', 'provincia', 'nazione',
            'latitudine', 'longitudine',
            'foto_profilo',
        )


class RevealTelefonoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professionista
        fields = ('telefono',)


class ProvinciaSerializer(serializers.Serializer):
    provincia = serializers.CharField()
    count = serializers.IntegerField()
