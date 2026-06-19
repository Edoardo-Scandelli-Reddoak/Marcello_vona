from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify

# Distanza minima (in giorni) tra una pausa e la successiva: massimo 1 pausa al mese.
PAUSA_COOLDOWN_DAYS = 30


class ProfessionistaQuerySet(models.QuerySet):
    def with_active_subscription(self, tipo: str | None = None):
        """Returns only escort with at least one active subscription.

        If tipo is provided ('standard' or 'evidenza'), restricts to that tier.
        Esclude le schede attualmente in pausa (in_pausa=True).
        """
        now = timezone.now()
        qs = self.filter(
            stato_approvazione='approvata',
            in_pausa=False,
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
        ('donna', 'Donna'),
        ('trans', 'Trans'),
        ('coppia', 'Coppia'),
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

    DISPONIBILITA_CHOICES = (
        ('', 'Non specificato'),
        ('ricevo', 'Ricevo (incall)'),
        ('altrui', 'Altrui (outcall)'),
        ('entrambe', 'Ricevo / Altrui'),
    )

    ORARI_TIPO_CHOICES = (
        ('', 'Non specificato'),
        ('24_7', '24/7'),
        ('h24', 'H24'),
        ('altro', 'Altro'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profilo')
    nome = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='escort')
    tags = models.ManyToManyField(Tag, blank=True, related_name='escort')
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
    zona = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name='Zona (es. centro, navigli, …)',
        help_text='Quartiere o zona della città mostrata accanto al nome (opzionale).',
    )
    provincia = models.CharField(max_length=2, verbose_name='Provincia (sigla, pubblica)')
    nazione = models.CharField(max_length=100, verbose_name='Stato / Nazione (pubblica)', default='Italia')
    disponibilita = models.CharField(
        max_length=20, choices=DISPONIBILITA_CHOICES, blank=True, default='',
        verbose_name='Disponibilità',
        help_text='Indica se ricevi (incall), vai dal cliente (outcall) o entrambe.',
    )
    # Orari: tipo preset + testo libero (usato quando tipo == "altro" o come dettaglio)
    orari_tipo = models.CharField(
        max_length=10, choices=ORARI_TIPO_CHOICES, blank=True, default='',
        verbose_name='Orari (tipo)',
    )
    orari_altro = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name='Orari (testo libero)',
        help_text='Es. "Lun-Ven 10-22, Sab su appuntamento".',
    )
    # Tariffe in EUR (interi). Vuoto = non mostrare.
    tariffa_30min = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name='Tariffa 30 minuti (€)',
    )
    tariffa_1ora = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name='Tariffa 1 ora (€)',
    )
    latitudine = models.FloatField(null=True, blank=True)
    longitudine = models.FloatField(null=True, blank=True)

    foto_profilo = models.ImageField(upload_to='escort/profilo/')
    documento_fronte = models.ImageField(upload_to='escort/documenti/')
    documento_retro = models.ImageField(upload_to='escort/documenti/')
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

    # Pausa scheda — l'escort può sospendere la propria scheda (nasconde dai listing)
    # massimo una volta al mese. `pausa_iniziata_at` resta valorizzato anche dopo
    # la riattivazione per applicare il cooldown di PAUSA_COOLDOWN_DAYS.
    in_pausa = models.BooleanField(default=False, verbose_name='In pausa')
    pausa_iniziata_at = models.DateTimeField(null=True, blank=True, verbose_name='Ultima pausa iniziata il')

    click_telefono = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProfessionistaQuerySet.as_manager()

    class Meta:
        verbose_name_plural = 'Escort'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Normalizza la sigla provincia: sempre MAIUSCOLO e senza spazi,
        # così "bo", "Bo" e "BO" diventano un unico valore "BO".
        if self.provincia:
            self.provincia = self.provincia.strip().upper()
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
        """True se la Promozione globale è attiva e non scaduta. Lo sconto
        effettivo viene poi letto da `piano.sconto_percentuale` per piano.
        """
        from apps.abbonamenti.models import Promozione
        return Promozione.get_current() is not None

    @property
    def rating_medio(self):
        recensioni = self.recensioni.all()
        if not recensioni:
            return 0
        return round(sum(r.stelle for r in recensioni) / len(recensioni), 1)

    @property
    def numero_recensioni(self):
        return self.recensioni.count()

    @property
    def prossima_pausa_disponibile_at(self):
        """Data dalla quale la professionista potrà mettere di nuovo in pausa la scheda.

        Restituisce None se non c'è mai stata una pausa o se il cooldown è già scaduto.
        """
        from datetime import timedelta
        if not self.pausa_iniziata_at:
            return None
        candidate = self.pausa_iniziata_at + timedelta(days=PAUSA_COOLDOWN_DAYS)
        if candidate <= timezone.now():
            return None
        return candidate

    def can_start_pause(self) -> bool:
        return self.prossima_pausa_disponibile_at is None


class FotoProfessionista(models.Model):
    professionista = models.ForeignKey(Professionista, on_delete=models.CASCADE, related_name='galleria')
    immagine = models.ImageField(upload_to='escort/galleria/')
    ordine = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordine']
        verbose_name_plural = 'Foto escort'

    def __str__(self):
        return f"Foto {self.ordine} di {self.professionista.nome}"


# Numero massimo di video che ogni escort può caricare. Esposto come costante
# pubblica per essere riutilizzato sia dai serializer che dal frontend.
MAX_VIDEO_PER_ESCORT = 5
MAX_FOTO_GALLERIA = 10


class VideoProfessionista(models.Model):
    professionista = models.ForeignKey(Professionista, on_delete=models.CASCADE, related_name='video')
    video = models.FileField(upload_to='escort/video/')
    ordine = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordine']
        verbose_name_plural = 'Video escort'

    def __str__(self):
        return f"Video {self.ordine} di {self.professionista.nome}"
