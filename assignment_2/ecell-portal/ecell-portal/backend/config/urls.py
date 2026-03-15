# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from core.auth import CustomTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    # API
    path("api/", include("core.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Public registration & status check
from core.views import RegisterView, RegistrationStatusView

urlpatterns_extra = [
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/registration-status/", RegistrationStatusView.as_view(), name="registration-status"),
]

# Merge into main urlpatterns
urlpatterns += urlpatterns_extra