import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


class TicketConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time ticket chat and status notifications.
    Group: ticket_{uuid}

    Incoming message types:
      - chat_message: { type, content, is_internal? }
      - status_update: { type, status }  (handled server-side via signals too)

    Outgoing message types:
      - chat_message: new comment broadcast
      - status_update: ticket status changed
      - notification: system notification
      - user_joined / user_left: presence
    """

    async def connect(self):
        self.ticket_id = self.scope["url_route"]["kwargs"]["ticket_id"]
        self.room_group_name = f"ticket_{self.ticket_id}"
        self.user = self.scope.get("user")

        # Reject unauthenticated connections
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify user has access to this ticket
        has_access = await self.check_ticket_access()
        if not has_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Broadcast user joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_presence",
                "event": "joined",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "role": self.user.role,
            },
        )
        logger.info(
            f"User {self.user.email} connected to ticket room {self.ticket_id}"
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_presence",
                    "event": "left",
                    "user_id": str(self.user.id) if self.user else None,
                    "user_name": self.user.full_name if self.user else "Unknown",
                    "role": self.user.role if self.user else None,
                },
            )
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON payload.")
            return

        msg_type = data.get("type")

        if msg_type == "chat_message":
            await self.handle_chat_message(data)
        elif msg_type == "typing":
            await self.handle_typing(data)
        else:
            await self.send_error(f"Unknown message type: {msg_type}")

    async def handle_chat_message(self, data):
        content = (data.get("content") or "").strip()
        if not content:
            await self.send_error("Message content cannot be empty.")
            return

        is_internal = data.get("is_internal", False)
        # Only staff can mark messages as internal
        if is_internal and self.user.role == "USER":
            is_internal = False

        # Persist comment to DB
        comment = await self.save_comment(content, is_internal)
        if not comment:
            await self.send_error("Failed to save message.")
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "comment_id": str(comment["id"]),
                "content": content,
                "is_internal": is_internal,
                "author_id": str(self.user.id),
                "author_name": self.user.full_name,
                "author_role": self.user.role,
                "timestamp": comment["created_at"],
            },
        )

    async def handle_typing(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing_indicator",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "is_typing": bool(data.get("is_typing", False)),
            },
        )

    # ─── Channel Layer Event Handlers ────────────────────────────────────────

    async def chat_message(self, event):
        """Receive from group, forward to WebSocket client."""
        # Hide internal messages from regular users
        if event.get("is_internal") and self.user.role == "USER":
            return
        await self.send(text_data=json.dumps({**event, "type": "chat_message"}))

    async def status_update(self, event):
        """Broadcast ticket status change to all participants."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "status_update",
                    "ticket_id": event["ticket_id"],
                    "old_status": event["old_status"],
                    "new_status": event["new_status"],
                    "changed_by_id": event["changed_by_id"],
                    "changed_by_name": event["changed_by_name"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    async def notification(self, event):
        """System notifications (escalation, assignment, etc.)."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "level": event.get("level", "info"),
                    "title": event.get("title"),
                    "message": event.get("message"),
                    "timestamp": event.get("timestamp"),
                }
            )
        )

    async def user_presence(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": f"user_{event['event']}",
                    "user_id": event["user_id"],
                    "user_name": event["user_name"],
                    "role": event["role"],
                }
            )
        )

    async def typing_indicator(self, event):
        # Don't echo back to sender
        if str(self.user.id) == event["user_id"]:
            return
        await self.send(text_data=json.dumps(event))

    # ─── Database Helpers ─────────────────────────────────────────────────────

    @database_sync_to_async
    def check_ticket_access(self):
        from .models import Ticket

        try:
            ticket = Ticket.objects.select_related(
                "creator", "assignee", "department"
            ).get(id=self.ticket_id)
        except Ticket.DoesNotExist:
            return False

        user = self.user
        if user.role == "OC":
            return True
        if user.role == "MANAGER":
            return ticket.department == user.department
        if user.role == "COORDINATOR":
            return ticket.assignee == user
        return ticket.creator == user

    @database_sync_to_async
    def save_comment(self, content, is_internal):
        from .models import Ticket, Comment

        try:
            ticket = Ticket.objects.get(id=self.ticket_id)
            comment = Comment.objects.create(
                ticket=ticket,
                author=self.user,
                content=content,
                is_internal=is_internal,
            )
            return {
                "id": comment.id,
                "created_at": comment.created_at.isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to save comment: {e}")
            return None

    # ─── Helpers ──────────────────────────────────────────────────────────────

    async def send_error(self, message):
        await self.send(
            text_data=json.dumps({"type": "error", "message": message})
        )


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Personal notification channel per user.
    Group: user_notifications_{user_id}
    Used for: escalation alerts, assignment notifications, role promotions.
    """

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f"user_notifications_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Clients don't send messages on this channel; it's receive-only
        pass

    async def send_notification(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "level": event.get("level", "info"),
                    "title": event.get("title", ""),
                    "message": event.get("message", ""),
                    "ticket_id": event.get("ticket_id"),
                    "timestamp": event.get("timestamp"),
                }
            )
        )
