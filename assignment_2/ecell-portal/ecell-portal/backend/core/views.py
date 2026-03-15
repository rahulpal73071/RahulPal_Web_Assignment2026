import logging
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Department, User, Ticket, Comment, Attachment, AuditLog
from .serializers import (
    DepartmentSerializer,
    UserSerializer,
    UserMinimalSerializer,
    PromoteUserSerializer,
    TicketListSerializer,
    TicketDetailSerializer,
    CommentSerializer,
    AttachmentSerializer,
    AuditLogSerializer,
)
from .permissions import (
    IsOC,
    IsManagerOrOC,
    IsStaffMember,
    CanViewTicket,
    CanModifyTicketStatus,
    CanPromoteUser,
)

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


def broadcast_status_update(ticket, old_status, changed_by):
    """Push status change to ticket WebSocket group and notify stakeholders."""
    group = f"ticket_{ticket.id}"
    payload = {
        "type": "status_update",
        "ticket_id": str(ticket.id),
        "old_status": old_status,
        "new_status": ticket.status,
        "changed_by_id": str(changed_by.id),
        "changed_by_name": changed_by.full_name,
        "timestamp": timezone.now().isoformat(),
    }
    async_to_sync(channel_layer.group_send)(group, payload)

    # Also notify creator, assignee, dept manager individually
    notification_msg = {
        "type": "send_notification",
        "level": "info",
        "title": "Ticket Updated",
        "message": f"Ticket '{ticket.title}' status changed from {old_status} to {ticket.status}.",
        "ticket_id": str(ticket.id),
        "timestamp": timezone.now().isoformat(),
    }
    for recipient in [ticket.creator, ticket.assignee, ticket.get_dept_manager()]:
        if recipient and recipient != changed_by:
            async_to_sync(channel_layer.group_send)(
                f"user_notifications_{recipient.id}", notification_msg
            )


def log_action(actor, action, target, previous=None, new=None, request=None):
    ip = None
    if request:
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = x_forwarded.split(",")[0] if x_forwarded else request.META.get("REMOTE_ADDR")
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=type(target).__name__,
        target_id=target.id,
        previous_state=previous,
        new_state=new,
        ip_address=ip,
    )


# ─── Department Views ─────────────────────────────────────────────────────────

class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsOC()]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsOC()]


# ─── User Views ───────────────────────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsStaffMember]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ["full_name", "email"]
    filterset_fields = ["role", "department", "is_active"]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.select_related("department").all()
        if user.role == "MANAGER":
            return qs.filter(department=user.department)
        return qs


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.select_related("department")
    serializer_class = UserSerializer
    permission_classes = [IsStaffMember]


class PromoteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in ("OC", "MANAGER"):
            return Response(
                {"detail": "Insufficient permissions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PromoteUserSerializer(
            data=request.data,
            context={"request": request, "target_user": target_user},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        old_role = target_user.role
        target_user.role = data["role"]
        if "department" in data and data["department"]:
            target_user.department = data["department"]
        target_user.save()

        log_action(
            actor=request.user,
            action="PROMOTE_USER",
            target=target_user,
            previous={"role": old_role},
            new={"role": target_user.role, "department": str(target_user.department_id)},
            request=request,
        )

        # Notify the promoted user
        async_to_sync(channel_layer.group_send)(
            f"user_notifications_{target_user.id}",
            {
                "type": "send_notification",
                "level": "success",
                "title": "Role Updated",
                "message": f"Your role has been updated to {target_user.role}.",
                "timestamp": timezone.now().isoformat(),
            },
        )

        return Response(UserSerializer(target_user, context={"request": request}).data)


# ─── Ticket Views ─────────────────────────────────────────────────────────────

class TicketListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "priority", "department", "assignee"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "priority"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TicketDetailSerializer
        return TicketListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related(
            "creator", "assignee", "department"
        ).prefetch_related("comments", "attachments")

        if user.role == "OC":
            return qs.all()
        if user.role == "MANAGER":
            return qs.filter(department=user.department)
        if user.role == "COORDINATOR":
            return qs.filter(assignee=user)
        return qs.filter(creator=user)

    def perform_create(self, serializer):
        ticket = serializer.save(creator=self.request.user)
        log_action(
            actor=self.request.user,
            action="CREATE_TICKET",
            target=ticket,
            new={"title": ticket.title, "status": ticket.status},
            request=self.request,
        )


class TicketDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, CanViewTicket]
    serializer_class = TicketDetailSerializer

    def get_queryset(self):
        return Ticket.objects.select_related(
            "creator", "assignee", "department"
        ).prefetch_related("comments__author", "attachments__uploaded_by")

    def perform_update(self, serializer):
        old_status = self.get_object().status
        ticket = serializer.save()

        if ticket.status != old_status:
            broadcast_status_update(ticket, old_status, self.request.user)
            log_action(
                actor=self.request.user,
                action="STATUS_CHANGE",
                target=ticket,
                previous={"status": old_status},
                new={"status": ticket.status},
                request=self.request,
            )


class TicketAssignView(APIView):
    """OC/Manager assigns ticket to a Coordinator."""
    permission_classes = [IsAuthenticated, IsManagerOrOC]

    def post(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

        # Manager can only assign tickets in their department
        if request.user.role == "MANAGER" and ticket.department != request.user.department:
            return Response(
                {"detail": "You can only assign tickets in your department."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assignee_id = request.data.get("assignee_id")
        if not assignee_id:
            return Response(
                {"detail": "assignee_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            assignee = User.objects.get(pk=assignee_id, role="COORDINATOR")
        except User.DoesNotExist:
            return Response(
                {"detail": "Coordinator not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if assignee.department != ticket.department:
            return Response(
                {"detail": "Coordinator must belong to the ticket's department."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = ticket.status
        ticket.assignee = assignee
        ticket.status = Ticket.Status.ASSIGNED
        ticket.save(update_fields=["assignee", "status", "updated_at"])

        broadcast_status_update(ticket, old_status, request.user)
        log_action(
            actor=request.user,
            action="ASSIGN_TICKET",
            target=ticket,
            previous={"status": old_status, "assignee": None},
            new={"status": ticket.status, "assignee": str(assignee.id)},
            request=request,
        )

        return Response(TicketDetailSerializer(ticket, context={"request": request}).data)


# ─── Comment Views ────────────────────────────────────────────────────────────

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_ticket(self):
        try:
            return Ticket.objects.get(pk=self.kwargs["ticket_pk"])
        except Ticket.DoesNotExist:
            return None

    def get_queryset(self):
        ticket = self.get_ticket()
        if not ticket:
            return Comment.objects.none()
        qs = Comment.objects.filter(ticket=ticket).select_related("author")
        if self.request.user.role == "USER":
            qs = qs.filter(is_internal=False)
        return qs

    def perform_create(self, serializer):
        ticket = self.get_ticket()
        if not ticket:
            from rest_framework.exceptions import NotFound
            raise NotFound("Ticket not found.")
        comment = serializer.save(author=self.request.user, ticket=ticket)

        # Broadcast via WebSocket
        async_to_sync(channel_layer.group_send)(
            f"ticket_{ticket.id}",
            {
                "type": "chat_message",
                "comment_id": str(comment.id),
                "content": comment.content,
                "is_internal": comment.is_internal,
                "author_id": str(self.request.user.id),
                "author_name": self.request.user.full_name,
                "author_role": self.request.user.role,
                "timestamp": comment.created_at.isoformat(),
            },
        )


# ─── Attachment Views ─────────────────────────────────────────────────────────

class AttachmentCreateView(generics.CreateAPIView):
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        ticket_id = self.kwargs["ticket_pk"]
        try:
            ticket = Ticket.objects.get(pk=ticket_id)
        except Ticket.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Ticket not found.")

        # Determine which file was sent and extract metadata from it
        raw_file  = self.request.FILES.get("file")
        raw_image = self.request.FILES.get("image")
        # Use whichever was provided for metadata; prefer image for display purposes
        meta_file = raw_image or raw_file

        if not meta_file:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "No file or image was provided."})

        serializer.save(
            uploaded_by=self.request.user,
            ticket=ticket,
            # Only set the field that was actually uploaded — leave the other as None
            file=raw_file if raw_file else None,
            image=raw_image if raw_image else None,
            original_filename=meta_file.name,
            file_size=meta_file.size,
            mime_type=meta_file.content_type or "application/octet-stream",
        )


# ─── Audit Log Views ──────────────────────────────────────────────────────────

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsOC]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["action", "target_type"]
    ordering_fields = ["timestamp"]

    def get_queryset(self):
        return AuditLog.objects.select_related("actor").all()


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user

    if user.role == "OC":
        qs = Ticket.objects.all()
    elif user.role == "MANAGER":
        qs = Ticket.objects.filter(department=user.department)
    elif user.role == "COORDINATOR":
        qs = Ticket.objects.filter(assignee=user)
    else:
        qs = Ticket.objects.filter(creator=user)

    stats = {
        "total": qs.count(),
        "open": qs.filter(status="OPEN").count(),
        "assigned": qs.filter(status="ASSIGNED").count(),
        "in_progress": qs.filter(status="IN_PROGRESS").count(),
        "resolved": qs.filter(status="RESOLVED").count(),
        "overdue": qs.filter(status="OVERDUE").count(),
    }

    if user.role in ("OC", "MANAGER"):
        stats["by_department"] = list(
            qs.values("department__name")
            .annotate(count=__import__("django.db.models", fromlist=["Count"]).Count("id"))
            .order_by("-count")[:5]
        )

    return Response(stats)


# ─── Self-Registration View ───────────────────────────────────────────────────

from .serializers import SelfRegisterSerializer, ApprovalQueueSerializer, ApproveRejectSerializer


class RegisterView(APIView):
    """
    Public endpoint — no authentication required.
    Creates a user with is_approved=False, is_active=False.
    Notifies all staff via WebSocket that a new approval request arrived.
    """
    permission_classes = []  # open to public

    def post(self, request):
        serializer = SelfRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Notify all staff (OC + Managers + Coordinators) via WS
        _notify_staff_new_registration(user)

        return Response(
            {
                "detail": "Registration submitted. "
                          "A staff member will review your request shortly.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


def _notify_staff_new_registration(user):
    """Push WebSocket notification to every active staff member."""
    from django.contrib.auth import get_user_model
    UserModel = get_user_model()
    staff = UserModel.objects.filter(
        role__in=["OC", "MANAGER", "COORDINATOR"],
        is_active=True,
        is_approved=True,
    )
    payload = {
        "type": "send_notification",
        "level": "info",
        "title": "New Registration Request",
        "message": f"{user.full_name} ({user.email}) has requested an account.",
        "ticket_id": None,
        "timestamp": timezone.now().isoformat(),
    }
    for staff_member in staff:
        try:
            async_to_sync(channel_layer.group_send)(
                f"user_notifications_{staff_member.id}", payload
            )
        except Exception:
            pass


# ─── Approval Queue Views ──────────────────────────────────────────────────────

class ApprovalQueueView(generics.ListAPIView):
    """
    GET /api/users/pending/
    Returns all users waiting for approval.
    Accessible by OC, Manager, Coordinator.
    """
    serializer_class = ApprovalQueueSerializer
    permission_classes = [IsAuthenticated, IsStaffMember]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "email"]
    ordering_fields = ["approval_requested_at"]

    def get_queryset(self):
        return (
            User.objects.filter(is_approved=False, is_active=False)
            .exclude(approval_requested_at=None)
            .order_by("approval_requested_at")
        )


class ApproveRejectUserView(APIView):
    """
    POST /api/users/{id}/approve/
    Body: { "action": "approve" | "reject", "rejection_reason": "..." }

    OC / Manager / Coordinator can approve or reject pending users.
    On approve  → is_approved=True, is_active=True, notify user.
    On reject   → rejection_reason saved, user remains inactive, notify user.
    """
    permission_classes = [IsAuthenticated, IsStaffMember]

    def post(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target.is_approved:
            return Response(
                {"detail": "User is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        reason = serializer.validated_data.get("rejection_reason", "")

        if action == "approve":
            target.is_approved = True
            target.is_active = True
            target.approved_by = request.user
            target.approved_at = timezone.now()
            target.rejection_reason = ""
            target.save(update_fields=[
                "is_approved", "is_active", "approved_by",
                "approved_at", "rejection_reason",
            ])

            log_action(
                actor=request.user,
                action="APPROVE_USER",
                target=target,
                previous={"is_approved": False},
                new={"is_approved": True},
                request=request,
            )

            # Notify the newly approved user
            try:
                async_to_sync(channel_layer.group_send)(
                    f"user_notifications_{target.id}",
                    {
                        "type": "send_notification",
                        "level": "success",
                        "title": "Account Approved! 🎉",
                        "message": "Your account has been approved. You can now log in.",
                        "timestamp": timezone.now().isoformat(),
                    },
                )
            except Exception:
                pass

            return Response(
                {"detail": f"{target.full_name} has been approved and can now log in."},
                status=status.HTTP_200_OK,
            )

        else:  # reject
            target.rejection_reason = reason
            # Keep is_approved=False, is_active=False but clear request timestamp
            # so it disappears from the queue after rejection
            target.approval_requested_at = None
            target.save(update_fields=["rejection_reason", "approval_requested_at"])

            log_action(
                actor=request.user,
                action="REJECT_USER",
                target=target,
                previous={"is_approved": False},
                new={"rejected": True, "reason": reason},
                request=request,
            )

            return Response(
                {"detail": f"{target.full_name}'s request has been rejected."},
                status=status.HTTP_200_OK,
            )


# ─── Registration status check (public) ──────────────────────────────────────

class RegistrationStatusView(APIView):
    """
    GET /api/auth/registration-status/?email=user@example.com
    Public endpoint — lets the RegisterPage poll for approval.
    Returns: { status: "pending" | "approved" | "rejected" | "not_found", rejection_reason? }
    """
    permission_classes = []

    def get(self, request):
        email = request.query_params.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "email param required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"status": "not_found"})

        if user.is_approved and user.is_active:
            return Response({"status": "approved"})

        if not user.is_approved and not user.approval_requested_at:
            # Rejected — request timestamp was cleared
            return Response({
                "status": "rejected",
                "rejection_reason": user.rejection_reason or "No reason provided.",
            })

        return Response({"status": "pending"})