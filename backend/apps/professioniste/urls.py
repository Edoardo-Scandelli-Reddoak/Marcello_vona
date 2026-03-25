from django.urls import path
from . import views

urlpatterns = [
    path('professioniste/', views.ProfessionistaListView.as_view(), name='professioniste-list'),
    path('professioniste/featured/', views.ProfessionistaFeaturedView.as_view(), name='professioniste-featured'),
    path('professioniste/nearby/', views.ProfessionistaNearbyView.as_view(), name='professioniste-nearby'),
    path('professioniste/map/', views.MapProfessionisteView.as_view(), name='professioniste-map'),
    path('professioniste/register/', views.ProfessionistaCreateView.as_view(), name='professioniste-register'),
    path('professioniste/dashboard/', views.ProfessionistaDashboardView.as_view(), name='professioniste-dashboard'),
    path('professioniste/<slug:slug>/', views.ProfessionistaDetailView.as_view(), name='professioniste-detail'),
    path('professioniste/<slug:slug>/telefono/', views.reveal_telefono, name='professioniste-telefono'),
    path('categorie/', views.CategoriaListView.as_view(), name='categorie-list'),
    path('province/', views.ProvinceListView.as_view(), name='province-list'),
    path('tags/', views.TagListView.as_view(), name='tags-list'),
]
