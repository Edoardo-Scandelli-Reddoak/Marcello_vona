from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

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
    # In produzione su Railway non c'è un nginx davanti a Django, e
    # `django.conf.urls.static.static()` è no-op con DEBUG=False: per
    # questo usiamo direttamente la view `serve` che funziona sempre.
    # Per traffico significativo (e per persistenza degli upload utente)
    # andrà sostituito con S3/R2 — i container Railway hanno filesystem
    # effimero (gli upload vengono persi a ogni redeploy).
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
