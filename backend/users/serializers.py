from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers


class UserAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']
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
        instance = super().update(instance, validated_data)
        if password is not None:
            instance.set_password(password)
            instance.save(update_fields=['password'])
        return instance
