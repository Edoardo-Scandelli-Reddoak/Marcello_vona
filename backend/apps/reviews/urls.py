from django.urls import path
from . import views

urlpatterns = [
    path('professioniste/<slug:slug>/recensioni/', views.RecensioneListView.as_view(), name='recensioni-list'),
    path('professioniste/<slug:slug>/recensioni/create/', views.RecensioneCreateView.as_view(), name='recensioni-create'),
    path('recensioni-sito/', views.RecensioneSitoListView.as_view(), name='recensioni-sito'),
]
