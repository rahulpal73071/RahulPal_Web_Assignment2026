"""
Celery background tasks for E-Cell Portal.

Beat schedule (add to settings.py):
    CELERY_BEAT_SCHEDULE = {
        'escalate-overdue-tickets': {
            'task': 'core.tasks.escalate_overdue_tickets',
            'schedule': crontab(minute=0, hour='*/1'),  # every hour
        },
    }
"""
import logging
from datetime import timedelta
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def escalate_overdue_tickets(self):
    """
    Flag OPEN tickets not assigned within 24 hours as OVERDUE.
    Notify all OC members via WebSocket and log the escalation.
    """
    from .models import Ticket, User, AuditLog

    threshold = timezone.now() - timedelta(hours=24)

    overdue_qs = Ticket.objects.filter(
        status=Ticket.Status.OPEN,
        created_at__lte=threshold,
        is_overdue_notified=False,
    ).select_related("creator", "department")

    if not overdue_qs.exists():
        logger.info("No overdue tickets found.")
        return {"escalated": 0}

    oc_members = list(User.objects.filter(role="OC", is_active=True))
    escalated_count = 0

    for ticket in overdue_qs:
        try:
            ticket.status = Ticket.Status.OVERDUE
            ticket.is_overdue_notified = True
            ticket.save(update_fields=["status", "is_overdue_notified", "updated_at"])

            AuditLog.objects.create(
                actor=None,
                action="AUTO_ESCALATE",
                target_type="Ticket",
                target_id=ticket.id,
                previous_state={"status": "OPEN"},
                new_state={"status": "OVERDUE"},
            )

            # Notify OC members
            notification_payload = {
                "type": "send_notification",
                "level": "warning",
                "title": "⚠️ Ticket Overdue",
                "message": (
                    f"Ticket '{ticket.title}' (#{str(ticket.id)[:8]}) has been "
                    f"open for >24 hours without assignment."
                ),
                "ticket_id": str(ticket.id),
                "timestamp": timezone.now().isoformat(),
            }

            for oc in oc_members:
                async_to_sync(channel_layer.group_send)(
                    f"user_notifications_{oc.id}", notification_payload
                )

            # Also broadcast in ticket room
            async_to_sync(channel_layer.group_send)(
                f"ticket_{ticket.id}",
                {
                    "type": "notification",
                    "level": "warning",
                    "title": "Ticket Escalated",
                    "message": "This ticket has been automatically escalated as OVERDUE.",
                    "timestamp": timezone.now().isoformat(),
                },
            )

            escalated_count += 1
            logger.warning(
                f"Escalated ticket {ticket.id} ({ticket.title}) to OVERDUE."
            )

        except Exception as exc:
            logger.error(f"Failed to escalate ticket {ticket.id}: {exc}")
            self.retry(exc=exc)

    logger.info(f"Escalation complete. {escalated_count} tickets marked OVERDUE.")
    return {"escalated": escalated_count}


@shared_task
def send_daily_digest():
    """
    Send daily summary to OC members with ticket statistics.
    """
    from .models import Ticket, User
    from django.db.models import Count

    stats = Ticket.objects.values("status").annotate(count=Count("id"))
    stats_dict = {s["status"]: s["count"] for s in stats}

    message = (
        f"Daily Digest — {timezone.now().strftime('%Y-%m-%d')}\n"
        f"Open: {stats_dict.get('OPEN', 0)} | "
        f"Assigned: {stats_dict.get('ASSIGNED', 0)} | "
        f"In Progress: {stats_dict.get('IN_PROGRESS', 0)} | "
        f"Resolved: {stats_dict.get('RESOLVED', 0)} | "
        f"Overdue: {stats_dict.get('OVERDUE', 0)}"
    )

    for oc in User.objects.filter(role="OC", is_active=True):
        async_to_sync(channel_layer.group_send)(
            f"user_notifications_{oc.id}",
            {
                "type": "send_notification",
                "level": "info",
                "title": "📊 Daily Ticket Digest",
                "message": message,
                "timestamp": timezone.now().isoformat(),
            },
        )

    return {"status": "sent", "message": message}
