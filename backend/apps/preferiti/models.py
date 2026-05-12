from django.conf import settings
from django.db import models


class Preferito(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preferiti',
    )
    professionista = models.ForeignKey(
        'professioniste.Professionista',
        on_delete=models.CASCADE,
        related_name='preferito_da',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'professionista')
        verbose_name = 'Preferito'
        verbose_name_plural = 'Preferiti'

    def __str__(self):
        return f'{self.user.email} ❤ {self.professionista.nome}'
