"""
Django signals for E-Cell Portal.
Used to trigger side-effects on model changes without polluting views/serializers.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

channel_layer = get_channel_layer()


@receiver(pre_save, sender="core.Ticket")
def capture_previous_status(sender, instance, **kwargs):
    """Store old status on instance so post_save can detect changes."""
    if instance.pk:
        try:
            from core.models import Ticket
            old = Ticket.objects.only("status").get(pk=instance.pk)
            instance._old_status = old.status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender="core.Ticket")
def notify_ticket_participants(sender, instance, created, **kwargs):
    """
    Broadcast a WebSocket notification when a ticket status changes,
    ensuring creator, assignee, and dept manager all receive an alert.
    """
    old_status = getattr(instance, "_old_status", None)

    if created:
        # Notify OC and dept manager on new ticket creation
        if instance.department:
            from core.models import User
            managers = User.objects.filter(
                role="MANAGER",
                department=instance.department,
                is_active=True,
            )
            for manager in managers:
                _send_user_notification(
                    user_id=str(manager.id),
                    level="info",
                    title="New Ticket",
                    message=f"New ticket submitted: '{instance.title}'",
                    ticket_id=str(instance.id),
                )

        # Also notify all OC members
        from core.models import User
        for oc in User.objects.filter(role="OC", is_active=True):
            _send_user_notification(
                user_id=str(oc.id),
                level="info",
                title="New Ticket",
                message=f"New ticket submitted in "
                        f"{instance.department.name if instance.department else 'no department'}: "
                        f"'{instance.title}'",
                ticket_id=str(instance.id),
            )
        return

    if old_status and old_status != instance.status:
        # Notify creator
        if instance.creator_id:
            _send_user_notification(
                user_id=str(instance.creator_id),
                level="info",
                title="Ticket Updated",
                message=f"Your ticket '{instance.title}' is now {instance.status.replace('_', ' ')}.",
                ticket_id=str(instance.id),
            )

        # Notify assignee (if different from creator)
        if instance.assignee_id and instance.assignee_id != instance.creator_id:
            _send_user_notification(
                user_id=str(instance.assignee_id),
                level="info",
                title="Ticket Updated",
                message=f"Ticket '{instance.title}' status: {instance.status.replace('_', ' ')}.",
                ticket_id=str(instance.id),
            )

        # Notify dept manager
        dept_manager = instance.get_dept_manager()
        if dept_manager:
            _send_user_notification(
                user_id=str(dept_manager.id),
                level="info",
                title="Ticket Status Changed",
                message=f"[{instance.department.name if instance.department else ''}] "
                        f"'{instance.title}': {old_status} → {instance.status}.",
                ticket_id=str(instance.id),
            )


def _send_user_notification(user_id, level, title, message, ticket_id=None):
    """Helper: push a notification to a user's personal WebSocket channel."""
    try:
        async_to_sync(channel_layer.group_send)(
            f"user_notifications_{user_id}",
            {
                "type": "send_notification",
                "level": level,
                "title": title,
                "message": message,
                "ticket_id": ticket_id,
                "timestamp": timezone.now().isoformat(),
            },
        )
    except Exception:
        # Channel layer may not be available during tests/migrations
        pass
