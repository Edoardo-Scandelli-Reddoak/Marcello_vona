from django.conf import settings
from django.db import models


class Notifica(models.Model):
    TIPO_CHOICES = (
        ('abbonamento_scaduto', 'Abbonamento scaduto'),
        ('abbonamento_in_scadenza', 'Abbonamento in scadenza'),
        ('generico', 'Generico'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifiche',
    )
    tipo = models.CharField(max_length=40, choices=TIPO_CHOICES, default='generico', db_index=True)
    titolo = models.CharField(max_length=200)
    messaggio = models.TextField()
    link = models.CharField(
        max_length=500, blank=True,
        help_text='Path interno (es. "/abbonamento") o URL completo dove portare l\'utente al click.',
    )
    letta = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'letta', '-created_at']),
        ]
        verbose_name = 'Notifica'
        verbose_name_plural = 'Notifiche'

    def __str__(self):
        return f'[{self.get_tipo_display()}] {self.titolo} → {self.user.email}'
