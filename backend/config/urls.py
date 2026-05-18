from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.professioniste.urls')),
    path('api/', include('apps.reviews.urls')),
    path('api/', include('apps.banners.urls')),
    path('api/', include('apps.abbonamenti.urls')),
    path('api/', include('apps.preferiti.urls')),
    path('api/', include('apps.sblocchi.urls')),
    path('api/', include('apps.notifiche.urls')),
]

# In produzione su Railway non c'è un nginx davanti a Django, quindi serviamo
# direttamente i file media dal processo gunicorn anche con DEBUG=False.
# Per traffico significativo (e per persistenza degli upload utente) andrà
# sostituito con S3/R2 — i container Railway hanno filesystem effimero.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
