"""
events/models.py

Defines the core data models for the Event Registration Platform:
  - Event     : An event created by an admin user.
  - Registration : A user's registration record for a specific event.

The built-in Django User model is used for authentication.
"""

from django.db import models
from django.contrib.auth.models import User


class Event(models.Model):
    """
    Represents a public event that users can register for.

    Only admin / superuser accounts are allowed to create, update,
    or delete Event records (enforced at the view / permission layer).
    """

    title = models.CharField(max_length=255)
    description = models.TextField()
    date = models.DateTimeField()
    location = models.CharField(max_length=500)

    # Optional promotional image uploaded to media/events/
    image = models.ImageField(upload_to='events/', blank=True, null=True)

    # Admin who created this event
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='events_created'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']   # Upcoming events first by default

    def __str__(self):
        return f"{self.title} ({self.date.strftime('%Y-%m-%d')})"


class Registration(models.Model):
    """
    Records a user's intent to attend a specific event.

    Captures additional participant details (name, phone, college, year)
    that may not be present on the user's account.

    Unique constraint: a user can only register once per event.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='registrations'
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='registrations'
    )

    # Participant details collected at registration time
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    college = models.CharField(max_length=255)
    year = models.CharField(
        max_length=10,
        help_text="Academic year, e.g. '1st', '2nd', 'Final'"
    )

    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent duplicate registrations at the database level
        unique_together = ('user', 'event')
        ordering = ['-registered_at']

    def __str__(self):
        return f"{self.user.username} → {self.event.title}"
