"""
events/admin.py

Registers the Event and Registration models with Django's admin panel.
Admins can create/edit/delete events and view all registrations from here.
"""

from django.contrib import admin
from .models import Event, Registration


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """Admin configuration for the Event model."""

    list_display = ('title', 'date', 'location', 'created_by', 'created_at', 'registration_count')
    list_filter = ('date', 'location')
    search_fields = ('title', 'description', 'location')
    readonly_fields = ('created_at',)
    ordering = ('date',)

    def registration_count(self, obj):
        """Show the number of registrations directly in the list view."""
        return obj.registrations.count()
    registration_count.short_description = 'Registrations'


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    """Admin configuration for the Registration model."""

    list_display = ('user', 'event', 'name', 'phone', 'college', 'year', 'registered_at')
    list_filter = ('event', 'year')
    search_fields = ('user__username', 'name', 'phone', 'college')
    readonly_fields = ('registered_at',)
    ordering = ('-registered_at',)
