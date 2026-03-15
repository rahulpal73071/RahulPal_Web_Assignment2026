from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = AccessToken(token_key)
        user_id = token["user_id"]
        return User.objects.get(id=user_id, is_active=True)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_key = params.get("token", [None])[0]

        if token_key:
            scope["user"] = await get_user_from_token(token_key)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)


def custom_exception_handler(exc, context):
    """Return structured JSON errors for all DRF exceptions."""
    response = exception_handler(exc, context)

    if response is not None:
        return Response(
            {
                "error": True,
                "status_code": response.status_code,
                "detail": response.data,
            },
            status=response.status_code,
        )

    return Response(
        {
            "error": True,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "detail": "An unexpected error occurred.",
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
