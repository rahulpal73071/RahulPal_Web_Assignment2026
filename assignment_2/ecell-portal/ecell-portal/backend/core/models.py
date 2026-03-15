import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.OC)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_approved", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)

    def create_self_registered(self, email, password, full_name):
        """
        Create a new self-registered user pending staff approval.
        User cannot log in until OC / Manager / Coordinator approves them.
        """
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            full_name=full_name,
            role="USER",
            is_approved=False,
            is_active=False,
            approval_requested_at=timezone.now(),
        )
        user.set_password(password)
        user.save(using=self._db)
        return user


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        OC = "OC", "Organizing Committee"
        MANAGER = "MANAGER", "Manager"
        COORDINATOR = "COORDINATOR", "Coordinator"
        USER = "USER", "User"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )

    # ── Account status ─────────────────────────────────────────────────────
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # ── Approval workflow ──────────────────────────────────────────────────
    is_approved = models.BooleanField(
        default=True,
        help_text="Staff-created and seeded users are auto-approved. "
                  "Self-registered users start as False and cannot login until approved.",
    )
    approval_requested_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp when the user submitted their registration request.",
    )
    approved_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="approved_users",
        help_text="Staff member who approved this registration.",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(
        max_length=500, blank=True,
        help_text="Optional reason shown to the user if their request is rejected.",
    )

    date_joined = models.DateTimeField(default=timezone.now)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def clean(self):
        # Enforce max 2 OC members
        if self.role == self.Role.OC:
            qs = User.objects.filter(role=self.Role.OC)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.count() >= 2:
                raise ValidationError(
                    {"role": "Maximum 2 OC members allowed. Limit reached."}
                )

        # Manager must have a department
        if self.role == self.Role.MANAGER and not self.department_id:
            raise ValidationError(
                {"department": "A Manager must be assigned to a department."}
            )

        # Coordinator must have a department
        if self.role == self.Role.COORDINATOR and not self.department_id:
            raise ValidationError(
                {"department": "A Coordinator must be assigned to a department."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    @property
    def is_oc(self):
        return self.role == self.Role.OC

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER

    @property
    def is_coordinator(self):
        return self.role == self.Role.COORDINATOR

    @property
    def pending_approval(self):
        return not self.is_approved and not self.is_active and bool(self.approval_requested_at)

    class Meta:
        ordering = ["full_name"]


class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        OVERDUE = "OVERDUE", "Overdue"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.MEDIUM
    )
    creator = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_tickets"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    is_overdue_notified = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"[{self.status}] {self.title}"

    def get_dept_manager(self):
        if self.department:
            return User.objects.filter(
                role=User.Role.MANAGER, department=self.department
            ).first()
        return None

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["creator", "status"]),
            models.Index(fields=["assignee", "status"]),
        ]


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField()
    is_internal = models.BooleanField(
        default=False, help_text="Internal notes visible only to staff"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment by {self.author} on {self.ticket}"

    class Meta:
        ordering = ["created_at"]


class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="attachments"
    )
    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="attachments/%Y/%m/", null=True, blank=True)
    image = models.ImageField(upload_to="screenshots/%Y/%m/", null=True, blank=True)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="Size in bytes")
    mime_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_filename} → {self.ticket}"

    class Meta:
        ordering = ["-uploaded_at"]


class AuditLog(models.Model):
    """Track all status transitions and role changes for compliance."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50)
    target_id = models.UUIDField()
    previous_state = models.JSONField(null=True, blank=True)
    new_state = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.actor} → {self.action} at {self.timestamp}"