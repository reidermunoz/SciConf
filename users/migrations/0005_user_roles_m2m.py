from django.db import migrations, models


def copy_role_to_roles(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for user in User.objects.exclude(role__isnull=True).iterator():
        user.roles.add(user.role_id)


def copy_roles_to_role(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for user in User.objects.prefetch_related('roles').iterator():
        first_role = user.roles.first()
        if first_role:
            user.role_id = first_role.id
            user.save(update_fields=['role'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_seed_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='roles',
            field=models.ManyToManyField(blank=True, related_name='users', to='users.role'),
        ),
        migrations.RunPython(copy_role_to_roles, copy_roles_to_role),
        migrations.RemoveField(
            model_name='user',
            name='role',
        ),
    ]
