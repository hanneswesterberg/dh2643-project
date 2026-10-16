from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_userprofile_social_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='profile_picture_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='profile_pictures/',
            ),
        ),
    ]
