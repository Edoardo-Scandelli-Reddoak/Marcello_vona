from django.urls import path
from . import views

urlpatterns = [
    path('sblocchi/checkout/', views.SbloccoCheckoutView.as_view(), name='sblocchi-checkout'),
    path('sblocchi/check-session/', views.SbloccoCheckSessionView.as_view(), name='sblocchi-check-session'),
    path('sblocchi/webhook/', views.stripe_webhook, name='sblocchi-webhook'),
]
