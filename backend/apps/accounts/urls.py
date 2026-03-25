from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.CookieTokenObtainPairView.as_view(), name='login'),
    path('refresh/', views.CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.MeView.as_view(), name='me'),
]
