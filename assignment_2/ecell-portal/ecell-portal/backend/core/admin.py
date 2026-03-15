from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department, Ticket, Comment, Attachment, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "full_name", "role", "department", "is_active", "date_joined"]
    list_filter = ["role", "department", "is_active"]
    search_fields = ["email", "full_name"]
    ordering = ["email"]
    readonly_fields = ["date_joined", "last_login"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("full_name", "avatar")}),
        ("Role & Dept", {"fields": ("role", "department")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("date_joined", "last_login")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "role", "department", "password1", "password2"),
        }),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "member_count", "created_at"]
    search_fields = ["name"]

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = "Members"


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "creator", "department", "assignee", "created_at"]
    list_filter = ["status", "priority", "department"]
    search_fields = ["title", "description"]
    readonly_fields = ["created_at", "updated_at", "resolved_at"]
    raw_id_fields = ["creator", "assignee", "department"]
    date_hierarchy = "created_at"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["ticket", "author", "is_internal", "created_at"]
    list_filter = ["is_internal"]
    raw_id_fields = ["ticket", "author"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["original_filename", "ticket", "uploaded_by", "file_size", "uploaded_at"]
    readonly_fields = ["file_size", "mime_type", "uploaded_at"]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "actor", "target_type", "target_id", "timestamp"]
    list_filter = ["action", "target_type"]
    readonly_fields = ["actor", "action", "target_type", "target_id",
                       "previous_state", "new_state", "timestamp", "ip_address"]
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
