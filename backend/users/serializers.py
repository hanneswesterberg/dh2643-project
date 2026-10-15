from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import UserProfile


class UserAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    display_name = serializers.CharField(source='profile.display_name', required=False, allow_blank=True)
    profile_picture = serializers.URLField(
        source='profile.profile_picture',
        required=False,
        allow_blank=True,
        max_length=500,
    )
    bio = serializers.CharField(source='profile.bio', required=False, allow_blank=True, max_length=500)
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
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
        return instance
