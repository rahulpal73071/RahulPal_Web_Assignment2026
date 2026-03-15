"""
Make Attachment.file nullable so image-only uploads work without a 400 error.
Previously the field required a value even when only 'image' was uploaded.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_user_approval_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attachment",
            name="file",
            field=models.FileField(
                upload_to="attachments/%Y/%m/",
                null=True,
                blank=True,
                help_text="Generic file upload. Null when the attachment is an image.",
            ),
        ),
    ]