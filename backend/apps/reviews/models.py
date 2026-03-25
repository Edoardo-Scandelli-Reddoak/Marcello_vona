from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Recensione(models.Model):
    professionista = models.ForeignKey(
        'professioniste.Professionista',
        on_delete=models.CASCADE,
        related_name='recensioni',
    )
    autore = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stelle = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    testo = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Recensioni'
        ordering = ['-created_at']
        unique_together = ('professionista', 'autore')

    def __str__(self):
        return f"Recensione di {self.autore} per {self.professionista}"


class RecensioneSito(models.Model):
    nome = models.CharField(max_length=200)
    testo = models.TextField()
    stelle = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    attiva = models.BooleanField(default=True)
    ordine = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Recensioni sito'
        ordering = ['ordine']

    def __str__(self):
        return f"Recensione sito di {self.nome}"
