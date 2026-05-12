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
    )

    posizione = models.CharField(
        max_length=50,
        choices=POSIZIONE_CHOICES,
        db_index=True,
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
