from django.urls import path
from . import views

urlpatterns = [
    path('escort/', views.ProfessionistaListView.as_view(), name='escort-list'),
    path('escort/featured/', views.ProfessionistaFeaturedView.as_view(), name='escort-featured'),
    path('escort/nearby/', views.ProfessionistaNearbyView.as_view(), name='escort-nearby'),
    path('escort/map/', views.MapEscortView.as_view(), name='escort-map'),
    path('escort/register/', views.ProfessionistaCreateView.as_view(), name='escort-register'),
    path('escort/dashboard/', views.ProfessionistaDashboardView.as_view(), name='escort-dashboard'),
    path('escort/dashboard/mi-trovo-qui/', views.MiTrovoQuiView.as_view(), name='escort-mi-trovo-qui'),
    path('escort/dashboard/pausa/', views.PausaSchedaView.as_view(), name='escort-pausa'),
    path('escort/dashboard/video/', views.VideoListCreateView.as_view(), name='escort-video-list'),
    path('escort/dashboard/video/<int:pk>/', views.VideoDeleteView.as_view(), name='escort-video-delete'),
    path('escort/dashboard/foto/', views.FotoListCreateView.as_view(), name='escort-foto-list'),
    path('escort/dashboard/foto/<int:pk>/', views.FotoDeleteView.as_view(), name='escort-foto-delete'),
    path('escort/<slug:slug>/', views.ProfessionistaDetailView.as_view(), name='escort-detail'),
    path('escort/<slug:slug>/telefono/', views.reveal_telefono, name='escort-telefono'),
    path('categorie/', views.CategoriaListView.as_view(), name='categorie-list'),
    path('province/', views.ProvinceListView.as_view(), name='province-list'),
    path('tags/', views.TagListView.as_view(), name='tags-list'),
]
