from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_approved",
            field=models.BooleanField(
                default=True,
                help_text="Staff-created users are auto-approved. Self-registered users start as False.",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="approval_requested_at",
            field=models.DateTimeField(blank=True, null=True,
                help_text="When the user submitted their registration request."),
        ),
        migrations.AddField(
            model_name="user",
            name="approved_by",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="approved_users",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="rejection_reason",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]