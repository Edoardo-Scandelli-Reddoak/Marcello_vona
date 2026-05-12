from django.urls import path
from . import views

urlpatterns = [
    path('banners/<str:posizione>/', views.BannerByPositionView.as_view(), name='banner-by-position'),
]
