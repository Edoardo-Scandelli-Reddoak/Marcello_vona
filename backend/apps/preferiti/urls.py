from django.urls import path
from . import views

urlpatterns = [
    path('preferiti/me/', views.PreferitiListView.as_view(), name='preferiti-me'),
    path('preferiti/<int:prof_id>/', views.PreferitoToggleView.as_view(), name='preferiti-toggle'),
]
