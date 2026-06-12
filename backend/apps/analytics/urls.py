from django.urls import path

from . import views

urlpatterns = [
    path('analytics/pageview/', views.PageViewBeaconView.as_view(), name='analytics-beacon'),
]
