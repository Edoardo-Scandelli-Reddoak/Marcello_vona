from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify

EARLY_BIRD_LIMIT = 10
EARLY_BIRD_DISCOUNT_PCT = 50


class ProfessionistaQuerySet(models.QuerySet):
    def with_active_subscription(self, tipo: str | None = None):
        """Returns only professioniste with at least one active subscription.

        If tipo is provided ('standard' or 'evidenza'), restricts to that tier.
        """
        now = timezone.now()
        qs = self.filter(
            stato_approvazione='approvata',
            abbonamenti__stato='attivo',
            abbonamenti__scadenza__gt=now,
        )
        if tipo:
            qs = qs.filter(abbonamenti__piano__tipo=tipo)
        return qs.distinct()

    def visible(self):
        return self.with_active_subscription()

    def featured_evidenza(self):
        return self.with_active_subscription(tipo='evidenza')


class Categoria(models.Model):
    CATEGORIA_CHOICES = (
        ('massaggi', 'Massaggi'),
        ('yoga', 'Yoga'),
        ('relax', 'Relax'),
    )
    nome = models.CharField(max_length=50, choices=CATEGORIA_CHOICES, unique=True)

    class Meta:
        verbose_name_plural = 'Categorie'

    def __str__(self):
        return self.get_nome_display()


class Tag(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = 'Tag'

    def __str__(self):
        return self.nome


class Professionista(models.Model):
    STATO_CHOICES = (
        ('in_attesa', 'In attesa di verifica'),
        ('approvata', 'Approvata'),
        ('rifiutata', 'Rifiutata'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profilo')
    nome = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='professioniste')
    tags = models.ManyToManyField(Tag, blank=True, related_name='professioniste')
    bio = models.TextField(blank=True)
    stato = models.CharField(
        max_length=80, blank=True, default='',
        verbose_name='Stato',
        help_text='Frase breve mostrata sotto il nome nella card (es. "Sempre disponibile").',
    )
    telefono = models.CharField(max_length=20)
    # Indirizzo PUBBLICO — quello mostrato agli utenti sul sito e usato sulla mappa.
    # Modificabile in qualsiasi momento dalla dashboard.
    via = models.CharField(max_length=500, verbose_name='Via / Indirizzo (pubblico)')
    cap = models.CharField(max_length=10, verbose_name='CAP (pubblico)')
    citta = models.CharField(max_length=200, verbose_name='Città (pubblica)')
    provincia = models.CharField(max_length=2, verbose_name='Provincia (sigla, pubblica)')
    nazione = models.CharField(max_length=100, verbose_name='Stato / Nazione (pubblica)', default='Italia')
    latitudine = models.FloatField(null=True, blank=True)
    longitudine = models.FloatField(null=True, blank=True)

    foto_profilo = models.ImageField(upload_to='professioniste/profilo/')
    documento_fronte = models.ImageField(upload_to='professioniste/documenti/')
    documento_retro = models.ImageField(upload_to='professioniste/documenti/')
    data_nascita = models.DateField(null=True, blank=True, verbose_name='Data di nascita')
    stato_approvazione = models.CharField(max_length=20, choices=STATO_CHOICES, default='in_attesa')
    data_verifica = models.DateTimeField(null=True, blank=True, verbose_name='Data verifica età')
    privacy_accettata = models.BooleanField(default=False)
    termini_accettati = models.BooleanField(default=False)
    # Social — link completo del profilo (es. https://instagram.com/...).
    # Vuoto = nessun bottone mostrato sul profilo pubblico.
    onlyfans_url = models.CharField(
        max_length=500, blank=True, verbose_name='Link OnlyFans',
    )
    instagram_url = models.CharField(
        max_length=500, blank=True, verbose_name='Link Instagram',
    )
    facebook_url = models.CharField(
        max_length=500, blank=True, verbose_name='Link Facebook',
    )
    tiktok_url = models.CharField(
        max_length=500, blank=True, verbose_name='Link TikTok',
    )
    telegram_url = models.CharField(
        max_length=500, blank=True, verbose_name='Link Telegram',
    )

    # Timestamp dell'ultimo aggiornamento dell'indirizzo pubblico
    # (utile per mostrarlo come "Indirizzo pubblico aggiornato il …").
    indirizzo_pubblico_aggiornato_at = models.DateTimeField(null=True, blank=True)

    click_telefono = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProfessionistaQuerySet.as_manager()

    class Meta:
        verbose_name_plural = 'Professioniste'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.nome)
            slug = base_slug
            counter = 1
            while Professionista.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome

    @property
    def is_early_bird(self) -> bool:
        """True if this professionista is among the first EARLY_BIRD_LIMIT registered."""
        from django.db.models import Q
        before = type(self).objects.filter(
            Q(created_at__lt=self.created_at)
            | Q(created_at=self.created_at, id__lt=self.id)
        ).count()
        return before < EARLY_BIRD_LIMIT

    @property
    def rating_medio(self):
        recensioni = self.recensioni.all()
        if not recensioni:
            return 0
        return round(sum(r.stelle for r in recensioni) / len(recensioni), 1)

    @property
    def numero_recensioni(self):
        return self.recensioni.count()


class FotoProfessionista(models.Model):
    professionista = models.ForeignKey(Professionista, on_delete=models.CASCADE, related_name='galleria')
    immagine = models.ImageField(upload_to='professioniste/galleria/')
    ordine = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordine']
        verbose_name_plural = 'Foto professioniste'

    def __str__(self):
        return f"Foto {self.ordine} di {self.professionista.nome}"
