from html import escape
from html.parser import HTMLParser

from django.core.files.uploadedfile import UploadedFile
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from PIL import Image, UnidentifiedImageError

from .models import UserProfile


MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024
ALLOWED_PROFILE_PICTURE_FORMATS = {'PNG', 'JPEG'}
MAX_BIO_LENGTH = 500


class _RichBioSanitizer(HTMLParser):
    allowed_tags = {'b', 'strong', 'i', 'em', 'u', 'p', 'br'}
    blocked_tags = {'script', 'style', 'iframe', 'object', 'svg', 'math'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.output = []
        self.open_tags = []
        self.blocked_tags_open = []
        self.text_length = 0

    def handle_starttag(self, tag, attrs):
        if self.blocked_tags_open:
            if tag in self.blocked_tags:
                self.blocked_tags_open.append(tag)
            return
        if tag in self.blocked_tags:
            self.blocked_tags_open.append(tag)
        elif tag in self.allowed_tags:
            self.output.append(f'<{tag}>')
            if tag != 'br':
                self.open_tags.append(tag)

    def handle_startendtag(self, tag, attrs):
        if not self.blocked_tags_open and tag in self.allowed_tags:
            self.output.append(f'<{tag} />' if tag == 'br' else f'<{tag}></{tag}>')

    def handle_endtag(self, tag):
        if self.blocked_tags_open:
            if tag in self.blocked_tags:
                for index in range(len(self.blocked_tags_open) - 1, -1, -1):
                    if self.blocked_tags_open[index] == tag:
                        del self.blocked_tags_open[index:]
                        break
            return
        if tag in self.open_tags:
            while self.open_tags:
                open_tag = self.open_tags.pop()
                self.output.append(f'</{open_tag}>')
                if open_tag == tag:
                    break

    def handle_data(self, data):
        if not self.blocked_tags_open:
            self.output.append(escape(data, quote=False))
            self.text_length += len(data)

    def finish(self):
        self.close()
        while self.open_tags:
            self.output.append(f'</{self.open_tags.pop()}>')
        return ''.join(self.output)


def sanitize_rich_bio(value, *, enforce_max_length=False):
    sanitizer = _RichBioSanitizer()
    sanitizer.feed(value)
    sanitized_value = sanitizer.finish()
    if enforce_max_length and sanitizer.text_length > MAX_BIO_LENGTH:
        raise serializers.ValidationError(
            f'Bio must be {MAX_BIO_LENGTH} characters or fewer.'
        )
    return sanitized_value


class RichBioField(serializers.CharField):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return sanitize_rich_bio(value, enforce_max_length=True)

    def to_representation(self, value):
        return sanitize_rich_bio(value or '')


def validate_profile_picture_image(uploaded_file):
    if uploaded_file.size > MAX_PROFILE_PICTURE_SIZE:
        raise serializers.ValidationError('Profile pictures must be 2 MB or smaller.')

    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as image:
            if image.format not in ALLOWED_PROFILE_PICTURE_FORMATS:
                raise serializers.ValidationError('Profile pictures must be PNG or JPEG images.')
            image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as error:
        raise serializers.ValidationError('Upload a valid PNG or JPEG image.') from error
    finally:
        uploaded_file.seek(0)


class ProfilePictureField(serializers.Field):
    def to_representation(self, profile):
        if profile is None:
            return ''

        if profile.profile_picture_image:
            picture_url = profile.profile_picture_image.url
        else:
            picture_url = profile.profile_picture

        return picture_url

    def to_internal_value(self, data):
        if isinstance(data, UploadedFile):
            if data.size > MAX_PROFILE_PICTURE_SIZE:
                raise serializers.ValidationError('Profile pictures must be 2 MB or smaller.')

            image = serializers.ImageField(
                validators=[validate_profile_picture_image],
            ).run_validation(data)
            return {
                'profile_picture': '',
                'profile_picture_image': image,
            }

        picture_url = serializers.URLField(
            max_length=500,
            allow_blank=True,
        ).run_validation(data)
        return {
            'profile_picture': picture_url,
            'profile_picture_image': None,
        }


class UserAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    display_name = serializers.CharField(source='profile.display_name', required=False, allow_blank=True)
    profile_picture = ProfilePictureField(source='profile', required=False)
    bio = RichBioField(source='profile.bio', required=False, allow_blank=True)
    location = serializers.CharField(source='profile.location', required=False, allow_blank=True, max_length=100)
    website = serializers.URLField(
        source='profile.website',
        required=False,
        allow_blank=True,
        max_length=200,
    )

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'display_name',
            'profile_picture',
            'bio',
            'location',
            'website',
        ]
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': True},
        }

    def validate(self, attrs):
        password = attrs.get('password')
        if password is not None:
            try:
                validate_password(password, user=self.instance)
            except ValidationError as error:
                raise serializers.ValidationError({'password': error.messages}) from error
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        profile_data = validated_data.pop('profile', {})

        instance = super().update(instance, validated_data)
        if password is not None:
            instance.set_password(password)
            instance.save(update_fields=['password'])
        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            old_picture = profile.profile_picture_image
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
            if old_picture and old_picture.name != profile.profile_picture_image.name:
                old_picture.delete(save=False)
        return instance
