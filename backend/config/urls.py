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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
