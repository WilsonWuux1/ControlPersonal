# Modelo de datos

La base local se llama `control-personal-db` y usa Dexie/IndexedDB. Todas las entidades principales incluyen `id`, `createdAt`, `updatedAt` y `schemaVersion`; las archivables usan `archivedAt` o `status`.

## Tablas

- `settings`: configuracion general, tema, moneda, meta de sueno, PIN local, persistencia y acciones de Salvar el dia.
- `habits`, `habitEntries`: definicion de habitos y registros diarios.
- `priorities`: tres prioridades del dia y pendientes generales.
- `projects`, `tasks`, `workSessions`: trabajo, tareas, sesiones, temporizador y resultados.
- `recreationLogs`: TikTok/entretenimiento separado por creacion, consumo intencional y desplazamiento automatico.
- `sleepLogs`, `mealLogs`, `trainingLogs`, `careLogs`, `socialLogs`: bienestar.
- `weightLogs`: historial de peso en libras; el ultimo registro actualiza el peso visible del perfil.
- `accounts`, `movements`, `budgets`, `obligations`, `debts`, `debtPayments`, `funds`: finanzas.
- `principles`, `motivationLinks`: principios, enlaces y notas motivacionales.
- `dailyCheckIns`, `moodEnergyLogs`: energia, animo, modo Salvar el dia e historial puntual de cambios guardados.

## Reglas financieras

- El saldo de cuenta se calcula desde `openingBalance` mas movimientos.
- Las transferencias restan de la cuenta origen y suman a la destino, pero no cuentan como ingreso ni gasto.
- El dinero libre es saldo liquido menos fondos apartados activos.
- Pagar una obligacion crea movimiento real, reduce cuenta, reduce fondo si aplica y actualiza la obligacion.
- Pagar deuda crea movimiento, reduce saldo de deuda y registra historial en `debtPayments`.
