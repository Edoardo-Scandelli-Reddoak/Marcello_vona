from django.urls import path
from . import views

urlpatterns = [
    path('piani/', views.PianiListView.as_view(), name='piani-list'),
    path('abbonamenti/checkout/', views.CheckoutCreateView.as_view(), name='abbonamenti-checkout'),
    path('abbonamenti/check-session/', views.CheckSessionView.as_view(), name='abbonamenti-check-session'),
    path('abbonamenti/discount-info/', views.DiscountInfoView.as_view(), name='abbonamenti-discount-info'),
    path('abbonamenti/me/', views.MyAbbonamentiView.as_view(), name='abbonamenti-me'),
    path('abbonamenti/webhook/', views.stripe_webhook, name='abbonamenti-webhook'),
]
