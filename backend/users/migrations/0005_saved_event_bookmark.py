import django.db.models.deletion
from django.db import migrations, models


def copy_saved_events_to_bookmarks(apps, schema_editor):
    UserProfile = apps.get_model('users', 'UserProfile')
    SavedEventBookmark = apps.get_model('users', 'SavedEventBookmark')
    database = schema_editor.connection.alias
    old_through = UserProfile._meta.get_field('saved_events').remote_field.through
    saved_event_pairs = old_through.objects.using(database).order_by('id').values_list(
        'userprofile_id',
        'event_id',
    )
    SavedEventBookmark.objects.using(database).bulk_create(
        [
            SavedEventBookmark(user_profile_id=profile_id, event_id=event_id)
            for profile_id, event_id in saved_event_pairs
        ],
    )
    SavedEventBookmark.objects.using(database).update(added_at=None)


def restore_saved_events_from_bookmarks(apps, schema_editor):
    UserProfile = apps.get_model('users', 'UserProfile')
    SavedEventBookmark = apps.get_model('users', 'SavedEventBookmark')
    database = schema_editor.connection.alias
    old_through = UserProfile._meta.get_field('saved_events').remote_field.through
    old_through.objects.using(database).bulk_create(
        [
            old_through(userprofile_id=profile_id, event_id=event_id)
            for profile_id, event_id in SavedEventBookmark.objects.using(database).values_list(
                'user_profile_id',
                'event_id',
            )
        ],
    )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_userprofile_profile_picture_original_image'),
    ]

    operations = [
        migrations.CreateModel(
            name='SavedEventBookmark',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'added_at',
                    models.DateTimeField(
                        auto_now_add=True,
                        blank=True,
                        null=True,
                    ),
                ),
                (
                    'event',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='saved_event_bookmarks',
                        to='events.event',
                    ),
                ),
                (
                    'user_profile',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='saved_event_bookmarks',
                        to='users.userprofile',
                    ),
                ),
            ],
            options={
                'constraints': [
                    models.UniqueConstraint(
                        fields=('user_profile', 'event'),
                        name='unique_profile_saved_event',
                    ),
                ],
            },
        ),
        migrations.RunPython(
            copy_saved_events_to_bookmarks,
            restore_saved_events_from_bookmarks,
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='saved_events',
        ),
        migrations.AddField(
            model_name='userprofile',
            name='saved_events',
            field=models.ManyToManyField(
                blank=True,
                related_name='saved_by_users',
                through='users.SavedEventBookmark',
                through_fields=('user_profile', 'event'),
                to='events.event',
            ),
        ),
    ]
