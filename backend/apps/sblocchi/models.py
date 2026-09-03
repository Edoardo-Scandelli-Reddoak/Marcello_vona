from django.conf import settings
from django.db import models


# Prezzo dello sblocco social in centesimi (1,90 €).
SBLOCCO_SOCIAL_PRICE_CENTS = 190


class SbloccoSocial(models.Model):
    """STORICO. Pagamenti one-shot da 1,90 € con cui gli utenti sbloccavano i
    link social di una scheda.

    Da settembre 2026 i social sono visibili a tutti gratuitamente: non si
    creano piu' record e non esiste piu' un checkout. La tabella resta perche'
    contiene incassi reali, conteggiati nel fatturato della pagina
    "Analisi dati" dell'admin.
    """
    PAYMENT_METHOD_CHOICES = (
        ('stripe', 'Stripe'),
        ('mock', 'Mock (sviluppo)'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sblocchi_social',
    )
    professionista = models.ForeignKey(
        'professioniste.Professionista',
        on_delete=models.CASCADE,
        related_name='sblocchi_social_da',
    )
    importo_centesimi = models.PositiveIntegerField(default=SBLOCCO_SOCIAL_PRICE_CENTS)
    attivo = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True)
    stripe_session_id = models.CharField(max_length=200, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Sblocco social'
        verbose_name_plural = 'Sblocchi social'
        indexes = [
            models.Index(fields=['user', 'professionista', 'attivo']),
        ]

    def __str__(self):
        return f'{self.user.email} → {self.professionista.nome} ({"attivo" if self.attivo else "in attesa"})'

    @property
    def importo_eur(self) -> float:
        return self.importo_centesimi / 100.0
