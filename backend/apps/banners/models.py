import re

from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, URLValidator
from django.db import models


_url_validator = URLValidator(schemes=['http', 'https'])
_email_validator = EmailValidator()
_tel_re = re.compile(r'^tel:\+?[\d\s\-().]{3,}$')


def validate_button_link(value: str) -> None:
    """Accepts http(s) URLs, mailto:<email> and tel:<number>."""
    if not value:
        return
    if value.startswith('mailto:'):
        email = value[len('mailto:'):]
        try:
            _email_validator(email)
        except ValidationError:
            raise ValidationError('Indirizzo email non valido dopo "mailto:".')
        return
    if value.startswith('tel:'):
        if not _tel_re.match(value):
            raise ValidationError('Numero di telefono non valido dopo "tel:".')
        return
    _url_validator(value)


class Banner(models.Model):
    POSIZIONE_CHOICES = (
        ('homepage_middle', 'Homepage — tra "Le più apprezzate" e "Vicino a te"'),
        ('homepage_after_cta', 'Homepage — sotto al banner "Sei un\'escort?"'),
        ('homepage_before_reviews', 'Homepage — sopra alla sezione "Cosa dicono di noi"'),
    )

    posizione = models.CharField(
        max_length=50,
        choices=POSIZIONE_CHOICES,
        unique=True,
        verbose_name='Posizione',
        help_text='Dove viene mostrato il banner.',
    )
    titolo = models.CharField(max_length=200)
    descrizione = models.TextField(blank=True)
    immagine = models.ImageField(upload_to='banners/', blank=True, null=True)
    button_testo = models.CharField(
        max_length=100, blank=True, verbose_name='Testo bottone',
        help_text='Lascia vuoto per non mostrare il bottone.',
    )
    button_link = models.CharField(
        max_length=500, blank=True,
        validators=[validate_button_link],
        verbose_name='Link bottone',
        help_text='URL completo (es. https://…, mailto:… oppure tel:…).',
    )
    attivo = models.BooleanField(default=True)
    ordine = models.PositiveIntegerField(
        default=0,
        help_text='Banner con ordine più basso vengono mostrati per primi a parità di posizione.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ordine', '-updated_at']
        verbose_name = 'Banner'
        verbose_name_plural = 'Banner'

    def __str__(self):
        return f'[{self.get_posizione_display()}] {self.titolo}'


class HeroSettings(models.Model):
    """Singleton: configurazione del banner principale (hero) della homepage.

    Permette all'admin di sostituire titolo, sottotitolo e immagine di
    sfondo senza dover passare per il codice. Tutti i campi sono opzionali:
    se vuoti, il frontend usa i valori di default codificati.
    """
    titolo = models.CharField(
        max_length=200, blank=True, default='',
        help_text=(
            'Titolo della sezione hero. Lascia vuoto per usare il default: '
            '"Le migliori escort a 5 stelle" (con la parola "escort" evidenziata in rosa). '
            'Se compili qui, il default viene sostituito col tuo testo (senza l\'evidenziato).'
        ),
    )
    sottotitolo = models.TextField(
        blank=True, default='',
        help_text=(
            'Frase descrittiva sotto al titolo. Lascia vuoto per usare il default: '
            '"Scopri le migliori escort vicino a te. Sfoglia le schede, leggi le recensioni '
            'e trova la escort perfetta per te in pochi click!".'
        ),
    )
    immagine = models.ImageField(
        upload_to='hero/', blank=True, null=True,
        help_text='Immagine di sfondo della sezione hero. Lascia vuoto per usare l\'immagine di default (hero-home.png).',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hero homepage'
        verbose_name_plural = 'Hero homepage'

    def __str__(self):
        return f'Hero homepage (aggiornato {self.updated_at:%Y-%m-%d %H:%M})'

    @classmethod
    def get_current(cls) -> 'HeroSettings | None':
        return cls.objects.first()
