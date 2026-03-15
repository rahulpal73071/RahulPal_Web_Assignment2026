# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path("dashboard/stats/", views.dashboard_stats, name="dashboard-stats"),

    # Departments
    path("departments/", views.DepartmentListCreateView.as_view(), name="dept-list"),
    path("departments/<uuid:pk>/", views.DepartmentDetailView.as_view(), name="dept-detail"),

    # Users
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/me/", views.UserProfileView.as_view(), name="user-profile"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/<uuid:pk>/promote/", views.PromoteUserView.as_view(), name="user-promote"),
    path("users/<uuid:pk>/approve/", views.ApproveRejectUserView.as_view(), name="user-approve"),
    path("users/pending/", views.ApprovalQueueView.as_view(), name="approval-queue"),

    # Tickets
    path("tickets/", views.TicketListCreateView.as_view(), name="ticket-list"),
    path("tickets/<uuid:pk>/", views.TicketDetailView.as_view(), name="ticket-detail"),
    path("tickets/<uuid:pk>/assign/", views.TicketAssignView.as_view(), name="ticket-assign"),

    # Comments
    path("tickets/<uuid:ticket_pk>/comments/", views.CommentListCreateView.as_view(), name="comment-list"),

    # Attachments
    path("tickets/<uuid:ticket_pk>/attachments/", views.AttachmentCreateView.as_view(), name="attachment-create"),

    # Audit
    path("audit/", views.AuditLogListView.as_view(), name="audit-log"),
]