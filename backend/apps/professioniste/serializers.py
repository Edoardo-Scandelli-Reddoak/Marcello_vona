from datetime import date
from django.utils import timezone
from rest_framework import serializers
from .models import Professionista, FotoProfessionista, Categoria, Tag


def _calcola_eta(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _normalize_social_url(value: str) -> str:
    """Validate / normalize a social profile link to a full http(s) URL.

    - empty string → empty (allowed; no button shown)
    - already starts with http:// or https:// → kept as-is
    - everything else → ValidationError (we want a real link, not just a username)
    """
    if not value:
        return ''
    v = value.strip()
    if not v:
        return ''
    lower = v.lower()
    if lower.startswith('http://') or lower.startswith('https://'):
        return v
    raise serializers.ValidationError(
        'Inserisci il link completo del profilo (deve iniziare con http:// o https://).'
    )


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
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Professionista
        fields = (
            'id', 'nome', 'slug', 'foto_profilo', 'stato',
            'categoria_nome', 'categoria_slug',
            'citta', 'provincia', 'latitudine', 'longitudine',
            'rating', 'numero_recensioni',
            'is_favorite',
        )

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.preferito_da.filter(user=request.user).exists()


class ProfessionistaDetailSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.get_nome_display', read_only=True)
    categoria_slug = serializers.CharField(source='categoria.nome', read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    galleria = FotoSerializer(many=True, read_only=True)
    rating = serializers.FloatField(source='rating_medio', read_only=True)
    numero_recensioni = serializers.IntegerField(read_only=True)
    indirizzo_completo = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    # Social: i link sono nascosti finché l'utente non paga lo sblocco.
    onlyfans_url = serializers.SerializerMethodField()
    instagram_url = serializers.SerializerMethodField()
    facebook_url = serializers.SerializerMethodField()
    tiktok_url = serializers.SerializerMethodField()
    telegram_url = serializers.SerializerMethodField()
    socials_unlocked = serializers.SerializerMethodField()
    has_any_social = serializers.SerializerMethodField()
    sblocco_social_prezzo_centesimi = serializers.SerializerMethodField()

    class Meta:
        model = Professionista
        fields = (
            'id', 'nome', 'slug', 'bio', 'stato', 'foto_profilo',
            'categoria_nome', 'categoria_slug',
            'tags', 'via', 'cap', 'citta', 'provincia', 'nazione',
            'indirizzo_completo',
            'latitudine', 'longitudine',
            'galleria', 'rating', 'numero_recensioni',
            'onlyfans_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'telegram_url',
            'has_any_social', 'socials_unlocked', 'sblocco_social_prezzo_centesimi',
            'indirizzo_pubblico_aggiornato_at',
            'is_favorite',
        )

    # ---------- helpers ----------
    def _socials_unlocked(self, obj) -> bool:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # La professionista vede SEMPRE i propri link (owner).
        if obj.user_id == request.user.id:
            return True
        # Lazy import per evitare cicli all'avvio
        from apps.sblocchi.models import user_has_unlocked_socials
        return user_has_unlocked_socials(request.user, obj)

    def _gated(self, raw_value, obj) -> str:
        return raw_value if self._socials_unlocked(obj) else ''

    # ---------- methods ----------
    def get_onlyfans_url(self, obj):
        return self._gated(obj.onlyfans_url, obj)

    def get_instagram_url(self, obj):
        return self._gated(obj.instagram_url, obj)

    def get_facebook_url(self, obj):
        return self._gated(obj.facebook_url, obj)

    def get_tiktok_url(self, obj):
        return self._gated(obj.tiktok_url, obj)

    def get_telegram_url(self, obj):
        return self._gated(obj.telegram_url, obj)

    def get_socials_unlocked(self, obj) -> bool:
        return self._socials_unlocked(obj)

    def get_has_any_social(self, obj) -> bool:
        return bool(
            obj.onlyfans_url or obj.instagram_url or obj.facebook_url
            or obj.tiktok_url or obj.telegram_url
        )

    def get_sblocco_social_prezzo_centesimi(self, obj) -> int:
        from apps.sblocchi.models import SBLOCCO_SOCIAL_PRICE_CENTS
        return SBLOCCO_SOCIAL_PRICE_CENTS

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.preferito_da.filter(user=request.user).exists()

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
    data_nascita = serializers.DateField(required=True)

    class Meta:
        model = Professionista
        fields = (
            'nome', 'categoria', 'tags', 'bio', 'stato', 'telefono',
            # Indirizzo pubblico (visibile sul sito, modificabile dalla dashboard)
            'via', 'cap', 'citta', 'provincia', 'nazione',
            'latitudine', 'longitudine',
            'foto_profilo', 'documento_fronte', 'documento_retro',
            'data_nascita',
            'onlyfans_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'telegram_url',
            'privacy_accettata', 'termini_accettati', 'galleria',
        )

    def validate_onlyfans_url(self, value):
        return _normalize_social_url(value)

    def validate_instagram_url(self, value):
        return _normalize_social_url(value)

    def validate_facebook_url(self, value):
        return _normalize_social_url(value)

    def validate_tiktok_url(self, value):
        return _normalize_social_url(value)

    def validate_telegram_url(self, value):
        return _normalize_social_url(value)

    def validate_data_nascita(self, value):
        today = date.today()
        if value > today:
            raise serializers.ValidationError('La data di nascita non può essere nel futuro.')
        if _calcola_eta(value) < 18:
            raise serializers.ValidationError(
                'Devi essere maggiorenne (18+) per registrarti come professionista.'
            )
        return value

    def create(self, validated_data):
        galleria_images = validated_data.pop('galleria', [])
        tags = validated_data.pop('tags', [])
        professionista = Professionista.objects.create(
            user=self.context['request'].user,
            stato_approvazione='approvata',
            data_verifica=timezone.now(),
            **validated_data,
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
            'nome', 'categoria', 'tags', 'bio', 'stato', 'telefono',
            # Indirizzo pubblico — modificabile in qualsiasi momento
            'via', 'cap', 'citta', 'provincia', 'nazione',
            'latitudine', 'longitudine',
            'foto_profilo',
            'onlyfans_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'telegram_url',
        )

    def validate_onlyfans_url(self, value):
        return _normalize_social_url(value)

    def validate_instagram_url(self, value):
        return _normalize_social_url(value)

    def validate_facebook_url(self, value):
        return _normalize_social_url(value)

    def validate_tiktok_url(self, value):
        return _normalize_social_url(value)

    def validate_telegram_url(self, value):
        return _normalize_social_url(value)

    def update(self, instance, validated_data):
        from django.utils import timezone
        public_fields = {'via', 'cap', 'citta', 'provincia', 'nazione', 'latitudine', 'longitudine'}
        if any(f in validated_data for f in public_fields):
            instance.indirizzo_pubblico_aggiornato_at = timezone.now()
        return super().update(instance, validated_data)


class RevealTelefonoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professionista
        fields = ('telefono',)


class ProvinciaSerializer(serializers.Serializer):
    provincia = serializers.CharField()
    count = serializers.IntegerField()
