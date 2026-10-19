from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_userprofile_profile_picture_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='profile_picture_original_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='profile_pictures/originals/',
            ),
        ),
    ]
