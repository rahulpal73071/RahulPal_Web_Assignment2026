# core/routing.py
from django.urls import re_path
from .consumers import TicketConsumer, NotificationConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/tickets/(?P<ticket_id>[0-9a-f-]{36})/$",
        TicketConsumer.as_asgi(),
        name="ticket-ws",
    ),
    re_path(
        r"^ws/notifications/$",
        NotificationConsumer.as_asgi(),
        name="notifications-ws",
    ),
]
