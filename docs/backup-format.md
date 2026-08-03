# Formato de respaldo

El respaldo JSON contiene:

```json
{
  "schemaVersion": 1,
  "backupId": "uuid",
  "createdAt": "2026-08-03T12:00:00.000Z",
  "deviceName": "Mi dispositivo",
  "entityCounts": {
    "habits": 13
  },
  "data": {
    "settings": {},
    "habits": [],
    "weightLogs": [],
    "movements": []
  }
}
```

## Importacion

La importacion valida el sobre con Zod, revisa version de esquema, muestra vista previa, permite reemplazar o combinar y detecta duplicados por UUID al combinar. Respaldos anteriores sin `moodEnergyLogs` o `weightLogs` siguen importando con listas vacias.

## Cifrado

La exportacion cifrada usa Web Crypto con AES-GCM. La contrasena no se guarda. Para restaurar un respaldo cifrado se debe ingresar la misma contrasena.
