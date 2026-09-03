from django.urls import path
from . import views

urlpatterns = [
    path('piani/', views.PianiListView.as_view(), name='piani-list'),
    path('abbonamenti/richiesta/', views.RichiestaAttivazioneView.as_view(), name='abbonamenti-richiesta'),
    path('abbonamenti/discount-info/', views.DiscountInfoView.as_view(), name='abbonamenti-discount-info'),
    path('promo/<slug:codice>/', views.CodicePromoValidateView.as_view(), name='codice-promo-validate'),
    path('abbonamenti/me/', views.MyAbbonamentiView.as_view(), name='abbonamenti-me'),
]
