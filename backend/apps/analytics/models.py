from django.db import models


class PageView(models.Model):
    """Singolo evento di visita anonima al sito.

    Privacy: NON memorizziamo l'IP in chiaro. Salviamo solo un hash
    salted (SHA-256 di IP + SECRET_KEY troncato a 16 byte) che permette di
    contare visitatori unici aggregati senza poter risalire all'IP. Niente
    cookie, niente fingerprinting: tracciamento minimo, no banner consent
    necessario.
    """

    path = models.CharField(max_length=500, db_index=True)
    ip_hash = models.CharField(max_length=64, db_index=True)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    referer = models.CharField(max_length=1000, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Visita'
        verbose_name_plural = 'Visite'

    def __str__(self):
        return f'{self.path} @ {self.created_at:%Y-%m-%d %H:%M}'
