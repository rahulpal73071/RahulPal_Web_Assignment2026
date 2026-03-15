import os
import django
from django.core.asgi import get_asgi_application

# 1. Set environment variable
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# 2. CRITICAL: Initialize Django before importing local apps
django.setup()

# 3. Initialize the HTTP application
django_asgi_app = get_asgi_application()

# 4. NOW import your custom code
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from core.middleware import JWTAuthMiddlewareStack
import core.routing

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(URLRouter(core.routing.websocket_urlpatterns))
        ),
    }
)