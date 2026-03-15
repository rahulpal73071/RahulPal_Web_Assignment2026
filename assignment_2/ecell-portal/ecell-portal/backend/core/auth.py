# core/auth.py
from rest_framework import serializers as drf_serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Block login if not yet approved
        if not user.is_approved:
            raise AuthenticationFailed(
                {
                    "code": "account_pending_approval",
                    "detail": (
                        "Your account is pending approval by a staff member. "
                        "You will be notified once approved."
                    ),
                }
            )

        # Block login if explicitly rejected / deactivated
        if not user.is_active:
            raise AuthenticationFailed(
                {
                    "code": "account_inactive",
                    "detail": "Your account has been deactivated. Please contact support.",
                }
            )

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed custom claims for frontend role-based rendering
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["email"] = user.email
        token["is_approved"] = user.is_approved
        token["department_id"] = str(user.department_id) if user.department_id else None
        token["department_name"] = user.department.name if user.department else None
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer