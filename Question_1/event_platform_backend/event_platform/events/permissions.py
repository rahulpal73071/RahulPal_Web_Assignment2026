"""
events/permissions.py

Custom DRF permission classes used across the Event Registration Platform.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    """
    - Admin (is_staff / is_superuser) users: full access (read + write).
    - Authenticated regular users: read-only access (GET, HEAD, OPTIONS).
    - Unauthenticated users: read-only access.
    """

    def has_permission(self, request, view):
        # Allow safe HTTP methods for everyone
        if request.method in SAFE_METHODS:
            return True

        # Write operations require an admin account
        return bool(request.user and request.user.is_staff)


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: allows access only to the owner of an
    object or to admin users.
    """

    def has_object_permission(self, request, view, obj):
        # Admins can do anything
        if request.user and request.user.is_staff:
            return True

        # Check that the object's `user` field matches the requesting user
        return getattr(obj, 'user', None) == request.user
