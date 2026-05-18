from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class PianoAbbonamento(models.Model):
    TIPO_CHOICES = (
        ('standard', 'Abbonamento standard'),
        ('evidenza', 'Abbonamento evidenza'),
    )

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, db_index=True)
    nome = models.CharField(max_length=100, help_text='Es. "7 giorni", "Extra Day".')
    durata_giorni = models.PositiveIntegerField()
    prezzo_centesimi = models.PositiveIntegerField(
        verbose_name='Prezzo (centesimi €)',
        help_text='Es. 1990 per 19,90 €.',
    )
    ordine = models.PositiveIntegerField(default=0)
    attivo = models.BooleanField(default=True)

    class Meta:
        ordering = ['tipo', 'ordine', 'durata_giorni']
        verbose_name = 'Piano abbonamento'
        verbose_name_plural = 'Piani abbonamento'

    def __str__(self):
        return f'[{self.get_tipo_display()}] {self.nome} — {self.prezzo_eur:.2f} €'

    @property
    def prezzo_eur(self) -> float:
        return self.prezzo_centesimi / 100.0


class Abbonamento(models.Model):
    STATO_CHOICES = (
        ('in_attesa', 'In attesa di pagamento'),
        ('attivo', 'Attivo'),
        ('scaduto', 'Scaduto'),
        ('annullato', 'Annullato'),
    )
    PAYMENT_METHOD_CHOICES = (
        ('stripe', 'Stripe'),
        ('mock', 'Mock (sviluppo)'),
    )

    professionista = models.ForeignKey(
        'professioniste.Professionista',
        on_delete=models.CASCADE,
        related_name='abbonamenti',
    )
    piano = models.ForeignKey(PianoAbbonamento, on_delete=models.PROTECT, related_name='abbonamenti')
    stato = models.CharField(max_length=20, choices=STATO_CHOICES, default='in_attesa', db_index=True)
    importo_centesimi = models.PositiveIntegerField(
        verbose_name='Importo (centesimi €)',
        help_text='Snapshot del prezzo al momento dell\'acquisto.',
    )

    inizio = models.DateTimeField(null=True, blank=True)
    scadenza = models.DateTimeField(null=True, blank=True, db_index=True)

    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True)
    stripe_session_id = models.CharField(max_length=200, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Abbonamento'
        verbose_name_plural = 'Abbonamenti'

    def __str__(self):
        return f'{self.professionista.nome} — {self.piano} ({self.get_stato_display()})'

    @property
    def importo_eur(self) -> float:
        return self.importo_centesimi / 100.0

    @property
    def is_attivo(self) -> bool:
        return (
            self.stato == 'attivo'
            and self.scadenza is not None
            and self.scadenza > timezone.now()
        )

    def activate(self, payment_method: str = 'stripe', stripe_payment_intent_id: str = '') -> None:
        """Marks the subscription as paid and sets inizio/scadenza.

        If the same escort profile already has an active abbonamento of the same tipo,
        the new duration is appended on top of the existing scadenza so that pre-renewals
        cumulate.
        """
        now = timezone.now()
        last = (
            Abbonamento.objects
            .filter(
                professionista=self.professionista,
                piano__tipo=self.piano.tipo,
                stato='attivo',
                scadenza__gt=now,
            )
            .exclude(pk=self.pk)
            .order_by('-scadenza')
            .first()
        )
        starting_point = last.scadenza if last else now
        self.inizio = now
        self.scadenza = starting_point + timedelta(days=self.piano.durata_giorni)
        self.stato = 'attivo'
        self.payment_method = payment_method or self.payment_method
        if stripe_payment_intent_id:
            self.stripe_payment_intent_id = stripe_payment_intent_id
        self.paid_at = now
        self.importo_centesimi = self.importo_centesimi or self.piano.prezzo_centesimi
        self.save()


def professionista_has_active_subscription(professionista_id: int, tipo: str | None = None) -> bool:
    """Helper used by other apps without circular import."""
    qs = Abbonamento.objects.filter(
        professionista_id=professionista_id,
        stato='attivo',
        scadenza__gt=timezone.now(),
    )
    if tipo:
        qs = qs.filter(piano__tipo=tipo)
    return qs.exists()
