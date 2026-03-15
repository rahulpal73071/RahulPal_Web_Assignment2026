from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Department, Ticket, Comment, Attachment, AuditLog

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "description", "member_count", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Lightweight user representation for nested use."""
    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "avatar"]
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    department_detail = DepartmentSerializer(source="department", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "role", "department",
            "department_detail", "is_active", "date_joined",
            "avatar", "password",
        ]
        read_only_fields = ["id", "date_joined"]
        extra_kwargs = {
            "department": {"write_only": True},
        }

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request:
            user = request.user
            # Only OC/Manager can see role field in write mode
            if user.is_authenticated and user.role not in ("OC", "MANAGER"):
                fields["role"].read_only = True
        return fields

    def validate(self, attrs):
        role = attrs.get("role", self.instance.role if self.instance else None)
        department = attrs.get(
            "department", self.instance.department if self.instance else None
        )

        # Validate OC limit on creation
        if role == "OC":
            qs = User.objects.filter(role="OC")
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.count() >= 2:
                raise serializers.ValidationError(
                    {"role": "Maximum 2 OC members allowed."}
                )

        # Manager/Coordinator needs department
        if role in ("MANAGER", "COORDINATOR") and not department:
            raise serializers.ValidationError(
                {"department": f"{role} must be assigned to a department."}
            )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PromoteUserSerializer(serializers.Serializer):
    """Used by OC/Manager to promote a user's role."""
    role = serializers.ChoiceField(choices=User.Role.choices)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )

    def validate(self, attrs):
        request = self.context["request"]
        target_user = self.context["target_user"]
        actor = request.user
        role = attrs.get("role")

        if actor.role == "MANAGER":
            if role != "COORDINATOR":
                raise serializers.ValidationError(
                    "Managers can only promote to COORDINATOR."
                )
            dept = attrs.get("department") or target_user.department
            if dept != actor.department:
                raise serializers.ValidationError(
                    "You can only promote users within your own department."
                )
            if target_user.role != "USER":
                raise serializers.ValidationError(
                    "Target user must currently have USER role."
                )
            attrs["department"] = actor.department

        elif actor.role == "OC":
            if role == "OC":
                qs = User.objects.filter(role="OC").exclude(pk=target_user.pk)
                if qs.count() >= 2:
                    raise serializers.ValidationError(
                        "Maximum 2 OC members allowed."
                    )
            if role in ("MANAGER", "COORDINATOR") and not attrs.get("department"):
                raise serializers.ValidationError(
                    {"department": f"{role} requires a department."}
                )
        else:
            raise serializers.ValidationError("Insufficient permissions.")

        return attrs


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Attachment
        fields = [
            "id", "file", "image", "original_filename",
            "file_size", "mime_type", "uploaded_by", "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_by", "uploaded_at", "file_size", "mime_type"]
        extra_kwargs = {
            # Both fields are optional individually — validation below ensures at least one
            "file":  {"required": False, "allow_null": True},
            "image": {"required": False, "allow_null": True},
        }

    def validate(self, attrs):
        file  = attrs.get("file")
        image = attrs.get("image")
        if not file and not image:
            raise serializers.ValidationError(
                "At least one of 'file' or 'image' must be provided."
            )
        return attrs


class CommentSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id", "ticket", "author", "content",
            "is_internal", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        # Non-staff cannot set is_internal
        if request and request.user.role == "USER":
            fields["is_internal"].read_only = True
        return fields

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")
        # Hide internal comments from regular users
        if request and request.user.role == "USER" and instance.is_internal:
            return None
        return rep


class TicketListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    creator = UserMinimalSerializer(read_only=True)
    assignee = UserMinimalSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    comment_count = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "status", "priority", "creator",
            "assignee", "department", "created_at", "updated_at",
            "due_date", "comment_count", "attachment_count", "tags",
        ]

    def get_comment_count(self, obj):
        request = self.context.get("request")
        qs = obj.comments.all()
        if request and request.user.role == "USER":
            qs = qs.filter(is_internal=False)
        return qs.count()

    def get_attachment_count(self, obj):
        return obj.attachments.count()


class TicketDetailSerializer(serializers.ModelSerializer):
    creator = UserMinimalSerializer(read_only=True)
    assignee = UserMinimalSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True,
        required=False, allow_null=True
    )
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="assignee", write_only=True,
        required=False, allow_null=True
    )
    comments = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "status", "priority",
            "creator", "assignee", "assignee_id", "department", "department_id",
            "comments", "attachments", "created_at", "updated_at",
            "resolved_at", "due_date", "tags",
        ]
        read_only_fields = ["id", "creator", "created_at", "updated_at", "resolved_at"]

    def get_comments(self, obj):
        request = self.context.get("request")
        qs = obj.comments.select_related("author").all()
        if request and request.user.role == "USER":
            qs = qs.filter(is_internal=False)
        serialized = CommentSerializer(qs, many=True, context=self.context).data
        return [c for c in serialized if c is not None]

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        new_status = attrs.get("status")

        if new_status and self.instance:
            current = self.instance.status
            valid_map = {
                "OPEN": ["ASSIGNED"],
                "ASSIGNED": ["IN_PROGRESS", "OPEN"],
                "IN_PROGRESS": ["RESOLVED", "ASSIGNED"],
                "RESOLVED": [],
                "OVERDUE": ["ASSIGNED"],
            }
            if new_status not in valid_map.get(current, []):
                raise serializers.ValidationError(
                    {"status": f"Cannot transition from {current} to {new_status}."}
                )

            role_map = {
                "OC": ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "OVERDUE"],
                "MANAGER": ["ASSIGNED", "IN_PROGRESS", "RESOLVED"],
                "COORDINATOR": ["IN_PROGRESS", "RESOLVED"],
                "USER": [],
            }
            if user and new_status not in role_map.get(user.role, []):
                raise serializers.ValidationError(
                    {"status": f"Your role cannot set status to {new_status}."}
                )

        # Validate assignee belongs to ticket's department (if both set)
        assignee = attrs.get("assignee")
        department = attrs.get("department") or (self.instance.department if self.instance else None)
        if assignee and department and assignee.department != department:
            raise serializers.ValidationError(
                {"assignee_id": "Assignee must belong to the ticket's department."}
            )

        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get("status")
        if new_status == "RESOLVED" and instance.status != "RESOLVED":
            validated_data["resolved_at"] = timezone.now()
        return super().update(instance, validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserMinimalSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "action", "target_type",
            "target_id", "previous_state", "new_state", "timestamp",
        ]
        read_only_fields = fields


# ─── Registration Serializer ──────────────────────────────────────────────────

class SelfRegisterSerializer(serializers.Serializer):
    """Public registration — creates a pending-approval USER account."""
    full_name = serializers.CharField(max_length=200, min_length=2)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_self_registered(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
        )


# ─── Approval Queue Serializer ────────────────────────────────────────────────

class ApprovalQueueSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the pending-approval user list."""
    waiting_since = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "full_name", "email", "role",
            "approval_requested_at", "waiting_since",
            "rejection_reason",
        ]
        read_only_fields = fields

    def get_waiting_since(self, obj):
        if not obj.approval_requested_at:
            return None
        from django.utils import timezone as tz
        delta = tz.now() - obj.approval_requested_at
        hours = int(delta.total_seconds() // 3600)
        if hours < 1:
            mins = int(delta.total_seconds() // 60)
            return f"{mins}m ago"
        if hours < 24:
            return f"{hours}h ago"
        return f"{delta.days}d ago"


class ApproveRejectSerializer(serializers.Serializer):
    """Payload for approving or rejecting a pending user."""
    action = serializers.ChoiceField(choices=["approve", "reject"])
    rejection_reason = serializers.CharField(
        max_length=500, required=False, allow_blank=True,
        help_text="Required when action=reject",
    )

    def validate(self, attrs):
        if attrs["action"] == "reject" and not attrs.get("rejection_reason", "").strip():
            raise serializers.ValidationError(
                {"rejection_reason": "Please provide a reason for rejection."}
            )
        return attrs