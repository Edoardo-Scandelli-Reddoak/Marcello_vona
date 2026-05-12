from django.urls import path
from . import views

urlpatterns = [
    path('notifiche/me/', views.NotificheListView.as_view(), name='notifiche-me'),
    path('notifiche/<int:id>/letta/', views.NotificaLettaView.as_view(), name='notifiche-letta'),
    path('notifiche/leggi-tutte/', views.NotificheLeggiTutteView.as_view(), name='notifiche-leggi-tutte'),
]
