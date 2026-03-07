"""
events/urls.py

URL patterns for the events app.

All routes are mounted under /api/ by the root URLconf.

Auth
  POST /api/signup              → Create new user account
  POST /api/login               → Obtain JWT access + refresh tokens
  POST /api/token/refresh       → Refresh an access token

Events
  GET  /api/events/             → List all events
  POST /api/events/             → Create event (admin only)
  GET  /api/events/<id>/        → Retrieve event detail
  PUT  /api/events/<id>/        → Update event (admin only)
  DELETE /api/events/<id>/      → Delete event (admin only)

Registrations
  POST /api/register-event/     → Register current user for an event
  GET  /api/my-registrations/   → List current user's registrations
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    SignupView,
    EventListView,
    EventDetailView,
    RegisterEventView,
    MyRegistrationsView,
)

urlpatterns = [
    # ── Auth ────────────────────────────────────────────────────────────────
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Events ───────────────────────────────────────────────────────────────
    path('events/', EventListView.as_view(), name='event_list'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event_detail'),

    # ── Registrations ────────────────────────────────────────────────────────
    path('register-event/', RegisterEventView.as_view(), name='register_event'),
    path('my-registrations/', MyRegistrationsView.as_view(), name='my_registrations'),
]
