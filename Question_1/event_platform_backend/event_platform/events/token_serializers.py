"""
events/token_serializers.py

Customise the SimpleJWT token to include `is_staff` in the payload.
This allows the frontend to know — without an extra API call — whether
the logged-in user is an admin, so it can show/hide admin UI.

The backend still enforces permissions on every request; this is
purely a UX convenience.

Add to settings.py:
    SIMPLE_JWT = {
        ...
        'TOKEN_OBTAIN_SERIALIZER': 'events.token_serializers.CustomTokenObtainPairSerializer',
    }
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to embed `is_staff`
    directly into the access token payload.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims — readable client-side by decoding the JWT
        token['is_staff'] = user.is_staff
        token['username'] = user.username

        return token
