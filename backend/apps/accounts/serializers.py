from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'user_type', 'first_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Le password non corrispondono.'})
        ut = attrs.get('user_type', 'user')
        if ut == 'professionista':
            attrs['user_type'] = 'escort'
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        first_name = validated_data.pop('first_name', '') or ''
        user_type = validated_data.get('user_type', 'user')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            user_type=user_type,
            first_name=first_name.strip(),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'user_type', 'first_name', 'last_name')
        read_only_fields = ('id', 'email', 'user_type')


def _valida_nuova_password(attrs, user=None):
    if attrs['new_password'] != attrs['new_password_confirm']:
        raise serializers.ValidationError({'new_password_confirm': 'Le password non corrispondono.'})
    try:
        validate_password(attrs['new_password'], user=user)
    except DjangoValidationError as e:
        raise serializers.ValidationError({'new_password': list(e.messages)})
    return attrs


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('La password attuale non è corretta.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'La nuova password deve essere diversa da quella attuale.'})
        return _valida_nuova_password(attrs, user)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    LINK_NON_VALIDO = 'Il link non è valido o è scaduto. Richiedine uno nuovo.'

    def validate(self, attrs):
        try:
            pk = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=pk, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'detail': self.LINK_NON_VALIDO})
        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'detail': self.LINK_NON_VALIDO})
        attrs['user'] = user
        return _valida_nuova_password(attrs, user)
