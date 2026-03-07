"""
events/views.py

API views for the Event Registration Platform.

Endpoints implemented here:
  Auth
    POST /api/signup           → SignupView
    POST /api/login            → Built-in TokenObtainPairView (configured in urls.py)

  Events
    GET  /api/events           → EventListView
    POST /api/events           → EventListView       (admin only)
    GET  /api/events/<id>/     → EventDetailView
    PUT  /api/events/<id>/     → EventDetailView     (admin only)
    DELETE /api/events/<id>/   → EventDetailView     (admin only)

  Registrations
    POST /api/register-event   → RegisterEventView   (authenticated)
    GET  /api/my-registrations → MyRegistrationsView (authenticated)
"""

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Event, Registration
from .serializers import (
    UserSignupSerializer,
    EventSerializer,
    EventListSerializer,
    RegistrationSerializer,
    MyRegistrationSerializer,
)
from .permissions import IsAdminOrReadOnly


# ---------------------------------------------------------------------------
# Auth Views
# ---------------------------------------------------------------------------

class SignupView(APIView):
    """
    POST /api/signup

    Creates a new user account.
    Open to unauthenticated requests.

    Request body:
        {
            "username": "john",
            "email": "john@example.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
            "first_name": "John",   // optional
            "last_name": "Doe"      // optional
        }

    Responses:
        201 Created  – user object
        400 Bad Request – validation errors
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'message': 'Account created successfully.',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                    }
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Event Views
# ---------------------------------------------------------------------------

class EventListView(APIView):
    """
    GET  /api/events  → Return paginated list of all events.
    POST /api/events  → Create a new event (admin only).
    """

    # Admins can write; anyone can read
    permission_classes = [IsAdminOrReadOnly]

    # Allow multipart uploads for the image field
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        """Return all events ordered by date (soonest first)."""
        events = Event.objects.select_related('created_by').all()
        serializer = EventListSerializer(events, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new event. Only accessible by admin users."""
        serializer = EventSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            event = serializer.save()
            return Response(
                EventSerializer(event, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EventDetailView(APIView):
    """
    GET    /api/events/<id>/  → Return event details (public).
    PUT    /api/events/<id>/  → Update event (admin only).
    DELETE /api/events/<id>/  → Delete event (admin only).
    """

    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_event(self, pk):
        """Helper: fetch event by primary key or return None."""
        try:
            return Event.objects.select_related('created_by').get(pk=pk)
        except Event.DoesNotExist:
            return None

    def get(self, request, pk):
        """Retrieve a single event with full details."""
        event = self._get_event(pk)
        if not event:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EventSerializer(event, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """Update an existing event (partial updates supported via partial=True)."""
        event = self._get_event(pk)
        if not event:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        # partial=True allows PATCH-like behaviour via PUT
        serializer = EventSerializer(
            event, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            updated_event = serializer.save()
            return Response(
                EventSerializer(updated_event, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Permanently delete an event and all its registrations."""
        event = self._get_event(pk)
        if not event:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        event.delete()
        return Response(
            {'message': 'Event deleted successfully.'},
            status=status.HTTP_200_OK
        )


# ---------------------------------------------------------------------------
# Registration Views
# ---------------------------------------------------------------------------

class RegisterEventView(APIView):
    """
    POST /api/register-event

    Registers the currently authenticated user for an event.
    Returns 400 if the user has already registered for that event.

    Request body:
        {
            "event": <event_id>,
            "name": "John Doe",
            "phone": "9876543210",
            "college": "MIT",
            "year": "2nd"
        }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            registration = serializer.save()
            return Response(
                {
                    'message': 'Successfully registered for the event.',
                    'registration': RegistrationSerializer(
                        registration, context={'request': request}
                    ).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MyRegistrationsView(APIView):
    """
    GET /api/my-registrations

    Returns all events that the currently authenticated user has registered for,
    with nested event details.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        registrations = (
            Registration.objects
            .filter(user=request.user)
            .select_related('event', 'event__created_by')
        )
        serializer = MyRegistrationSerializer(registrations, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
