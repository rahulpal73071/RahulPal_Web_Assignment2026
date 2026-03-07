"""
events/serializers.py

DRF serializers for:
  - UserSignupSerializer   : Validates and creates a new User account.
  - UserSerializer         : Read-only representation of a User.
  - EventSerializer        : Full Event representation (read/write).
  - EventListSerializer    : Lightweight Event representation for list views.
  - RegistrationSerializer : Creates and reads Registration records.
  - MyRegistrationSerializer: Nested view of registrations for the current user.
"""

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Event, Registration


# ---------------------------------------------------------------------------
# User Serializers
# ---------------------------------------------------------------------------

class UserSignupSerializer(serializers.ModelSerializer):
    """
    Handles new-user registration.

    Validates password strength via Django's built-in validators and
    ensures the two password fields match before creating the account.
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password', 'password2')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def validate(self, attrs):
        """Ensure both password fields match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        """Remove confirmation field, then create the user with a hashed password."""
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer used when embedding user info inside other serializers."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Event Serializers
# ---------------------------------------------------------------------------

class EventSerializer(serializers.ModelSerializer):
    """
    Full Event serializer used for retrieve, create, and update operations.

    `created_by` is automatically set from the request context and is
    therefore read-only on the API surface.
    """

    created_by = UserSerializer(read_only=True)
    registration_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'description', 'date', 'location',
            'image', 'created_by', 'created_at', 'registration_count',
        )
        read_only_fields = ('id', 'created_by', 'created_at')

    def get_registration_count(self, obj):
        """Return how many users have registered for this event."""
        return obj.registrations.count()

    def create(self, validated_data):
        """Attach the requesting admin as the creator before saving."""
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        return super().create(validated_data)


class EventListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the events list endpoint.
    Omits the full description to reduce payload size.
    """

    registration_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ('id', 'title', 'date', 'location', 'image', 'registration_count')

    def get_registration_count(self, obj):
        return obj.registrations.count()


# ---------------------------------------------------------------------------
# Registration Serializers
# ---------------------------------------------------------------------------

class RegistrationSerializer(serializers.ModelSerializer):
    """
    Handles creating a Registration record.

    - `user` and `registered_at` are set automatically.
    - Validates that the user has not already registered for the same event.
    """

    class Meta:
        model = Registration
        fields = ('id', 'user', 'event', 'name', 'phone', 'college', 'year', 'registered_at')
        read_only_fields = ('id', 'user', 'registered_at')

    def validate(self, attrs):
        """Prevent duplicate registrations for the same event."""
        request = self.context.get('request')
        user = request.user
        event = attrs.get('event')

        if Registration.objects.filter(user=user, event=event).exists():
            raise serializers.ValidationError(
                {'event': 'You have already registered for this event.'}
            )
        return attrs

    def create(self, validated_data):
        """Attach the authenticated user before saving."""
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)


class MyRegistrationSerializer(serializers.ModelSerializer):
    """
    Returns a user's registrations with full event details nested inline.
    Used by the /api/my-registrations endpoint.
    """

    event = EventListSerializer(read_only=True)

    class Meta:
        model = Registration
        fields = ('id', 'event', 'name', 'phone', 'college', 'year', 'registered_at')
        read_only_fields = fields
