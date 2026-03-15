from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOC(BasePermission):
    """Only OC members can access."""
    message = "Access restricted to Organizing Committee members."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "OC"
        )


class IsManagerOrOC(BasePermission):
    """OC or Managers."""
    message = "Access restricted to Managers and OC members."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("OC", "MANAGER")
        )


class IsDeptManager(BasePermission):
    """Department Manager for a specific ticket's department."""
    message = "You must be the manager of this ticket's department."

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == "OC":
            return True
        if request.user.role == "MANAGER":
            # obj is a Ticket
            ticket = obj if hasattr(obj, "department") else None
            if ticket:
                return ticket.department == request.user.department
        return False


class IsCoordinator(BasePermission):
    """Coordinator-level access."""
    message = "Access restricted to Coordinators."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("OC", "MANAGER", "COORDINATOR")
        )


class IsStaffMember(BasePermission):
    """Any staff member (OC, Manager, Coordinator)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("OC", "MANAGER", "COORDINATOR")
        )


class CanViewTicket(BasePermission):
    """
    - OC: all tickets
    - Manager: tickets in their department
    - Coordinator: only assigned tickets
    - User: only their own tickets
    """
    message = "You do not have permission to view this ticket."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role == "OC":
            return True
        if user.role == "MANAGER":
            return obj.department == user.department
        if user.role == "COORDINATOR":
            return obj.assignee == user
        # USER
        return obj.creator == user


class CanModifyTicketStatus(BasePermission):
    """Enforce status transition rules."""
    message = "You are not authorized to perform this status transition."

    VALID_TRANSITIONS = {
        "OPEN": ["ASSIGNED"],
        "ASSIGNED": ["IN_PROGRESS", "OPEN"],
        "IN_PROGRESS": ["RESOLVED", "ASSIGNED"],
        "RESOLVED": [],
        "OVERDUE": ["ASSIGNED"],
    }

    ROLE_ALLOWED_TRANSITIONS = {
        "OC": ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "OVERDUE"],
        "MANAGER": ["ASSIGNED", "IN_PROGRESS", "RESOLVED"],
        "COORDINATOR": ["IN_PROGRESS", "RESOLVED"],
        "USER": [],
    }

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user.is_authenticated:
            return False

        new_status = request.data.get("status")
        if not new_status:
            return True  # Not a status change request

        current_status = obj.status
        allowed_next = self.VALID_TRANSITIONS.get(current_status, [])
        role_allowed = self.ROLE_ALLOWED_TRANSITIONS.get(user.role, [])

        if new_status not in allowed_next:
            self.message = (
                f"Invalid transition from {current_status} to {new_status}. "
                f"Allowed: {allowed_next}"
            )
            return False

        if new_status not in role_allowed:
            self.message = f"Your role ({user.role}) cannot set status to {new_status}."
            return False

        return True


class CanPromoteUser(BasePermission):
    """
    OC can promote any USER to MANAGER.
    MANAGER can promote USER to COORDINATOR within their department only.
    """
    message = "You do not have permission to promote this user."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        target_role = request.data.get("role")
        if not target_role:
            return True

        if user.role == "OC":
            # OC can promote USER to MANAGER or COORDINATOR
            if obj.role != "USER":
                self.message = "Can only promote users with role USER."
                return False
            return target_role in ("MANAGER", "COORDINATOR", "OC")

        if user.role == "MANAGER":
            # Manager can only promote to COORDINATOR in own department
            if target_role != "COORDINATOR":
                self.message = "Managers can only promote users to COORDINATOR."
                return False
            if obj.department != user.department:
                self.message = "You can only promote users within your department."
                return False
            if obj.role != "USER":
                self.message = "Can only promote users with role USER."
                return False
            return True

        return False
