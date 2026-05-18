from django.conf import settings
from django.db import models


# Prezzo dello sblocco social in centesimi (1,90 €).
SBLOCCO_SOCIAL_PRICE_CENTS = 190


class SbloccoSocial(models.Model):
    """Pagamento one-shot di un utente per sbloccare i link social di un'escort.

    Una volta `attivo=True` (post-conferma pagamento) l'utente vede i bottoni social
    di quell'escort in modo permanente.
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


def user_has_unlocked_socials(user, escort_profile) -> bool:
    """Helper rapido — usato dal serializer del dettaglio scheda escort."""
    if not user or not user.is_authenticated:
        return False
    return SbloccoSocial.objects.filter(
        user=user, professionista=escort_profile, attivo=True
    ).exists()
