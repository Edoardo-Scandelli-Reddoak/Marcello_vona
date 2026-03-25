from django.db import models
from django.conf import settings
from django.utils.text import slugify


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
    telefono = models.CharField(max_length=20)
    via = models.CharField(max_length=500, verbose_name='Via / Indirizzo')
    cap = models.CharField(max_length=10, verbose_name='CAP')
    citta = models.CharField(max_length=200, verbose_name='Città')
    provincia = models.CharField(max_length=2, verbose_name='Provincia (sigla)')
    nazione = models.CharField(max_length=100, verbose_name='Stato / Nazione', default='Italia')
    latitudine = models.FloatField(null=True, blank=True)
    longitudine = models.FloatField(null=True, blank=True)
    foto_profilo = models.ImageField(upload_to='professioniste/profilo/')
    documento_fronte = models.ImageField(upload_to='professioniste/documenti/')
    documento_retro = models.ImageField(upload_to='professioniste/documenti/')
    stato_approvazione = models.CharField(max_length=20, choices=STATO_CHOICES, default='in_attesa')
    privacy_accettata = models.BooleanField(default=False)
    termini_accettati = models.BooleanField(default=False)
    visualizzazioni = models.PositiveIntegerField(default=0)
    click_telefono = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
