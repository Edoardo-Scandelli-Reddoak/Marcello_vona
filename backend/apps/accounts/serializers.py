from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

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
