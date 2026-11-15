from django.db import migrations

def create_roles(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    roles = [
        {
            'name': 'Administrador del Sistema',
            'description': 'Acceso total al sistema. Puede gestionar usuarios, roles y toda la configuracion.'
        },
        {
            'name' : 'Miembro Comité Científico',
            'description' : 'Puede revisar artículos, deshabilitar artículos y gestionar usuarios.'
        },
        {
            'name' : 'Autor',
            'description' : 'Puede proponer artículos y gestionar sus propios datos personales.'
        },
    ]
    for role in roles:
        Role.objects.get_or_create(name=role['name'], defaults={'description' : role['description']})

def delete_roles(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    Role.objects.filter(name__in = [
        'Adminstrador del sistema',
        'Miembro Comité Científico',
        'Autor',
    ]).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_passwordresetcode'), # Ultima migracion existente
    ]

    operations = [
        migrations.RunPython(create_roles, delete_roles),
    ]