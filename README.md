# Limpiasoft

Plataforma SaaS para que empresas de limpieza gestionen a su personal: puestos de trabajo, calendario de turnos, incidencias, tarifas por hora y el cálculo mensual de cuánto hay que pagar a cada empleado.

Cada empresa que se registra ve únicamente sus propios datos (multi-tenant con aislamiento por Row Level Security en Postgres). Dentro de cada empresa hay dos roles: **jefe** (gestiona todo) y **empleado** (ve su propio calendario, reporta incidencias y consulta lo que va a cobrar).

**Demo en vivo**: https://devvahlok.github.io/limpiasoft/ (se despliega automáticamente en cada push a `main`, ver [Despliegue](#despliegue)).

## Stack técnico

- **Frontend**: Angular 16 (standalone components, sin NgModules), Angular Material.
- **Backend**: [Supabase](https://supabase.com) — Postgres con Row Level Security, Supabase Auth, y dos Edge Functions (Deno) para las operaciones que requieren privilegios de administrador.
- **Sin backend propio**: el cliente Angular habla directamente con Supabase (PostgREST) respetando las políticas RLS; las Edge Functions solo se usan donde hace falta la Admin API (creación de cuentas).

## Autenticación: usuario + PIN, no email

El login no usa un email real: cada persona tiene un **usuario** (`nombre.apellido`, generado automáticamente y con sufijo numérico si ya existe) y un **PIN de 4 dígitos** (por defecto `0000`, cambiable desde la propia app). Fue una decisión de producto para que el personal de limpieza pueda entrar rápido sin depender de un correo.

Por debajo, Supabase Auth sigue exigiendo un email y una contraseña con longitud mínima, así que se codifican de forma interna y transparente para el usuario:

- Email interno: `usuario@limpiasoft.app` (nunca se envía correo a ese dominio).
- Contraseña interna: `lsft-<PIN>`.

Tanto el alta de una empresa nueva como el alta de un empleado se hacen a través de **Edge Functions con la Admin API** (`registrar-empresa`, `crear-empleado`), nunca con el `signUp()` público del cliente: así se evita depender de confirmaciones por email y de los límites de envío del mailer de pruebas de Supabase, y permite validar en el servidor (nunca confiando en el cliente) quién puede dar de alta a quién.

## Modelo de datos y seguridad

Todo el aislamiento entre empresas y entre roles se hace con políticas **RLS** en Postgres (no hay comprobaciones de permisos "a mano" en el frontend salvo los guards de rutas, que son solo para la UX — la seguridad real está en la base de datos).

| Tabla | Qué guarda | Quién puede leer/escribir |
|---|---|---|
| `empresas` | Cada empresa registrada | El jefe ve/edita la suya |
| `profiles` | Perfil de cada usuario (1:1 con `auth.users`): rol, nombre, username, empresa | Cada uno ve el suyo; el jefe ve los de su empresa |
| `puestos_trabajo` | Localizaciones/clientes a limpiar | Jefe: todo. Empleado: solo lectura de los de su empresa |
| `tarifas` | Historial de tarifa €/h por empleado (con fecha de vigencia, no un valor único) | Jefe: todo. Empleado: solo lectura de la suya |
| `turnos` | Calendario: empleado + puesto + fecha + horario + estado (`programado`/`completado`/`cancelado`) | Jefe: todo. Empleado: solo lectura de los suyos |
| `incidencias` | Reportes de problemas del empleado, opcionalmente ligados a un turno | Empleado: lee/crea las suyas. Jefe: lee/revisa las de su empresa |
| `app_admins` | Cuentas de desarrollador (ver más abajo), sin relación con ninguna empresa | Cada desarrollador solo puede leer su propia fila; el resto de operaciones pasan por Edge Functions |
| `pagos` | Pagos reales registrados a mano por el desarrollador (empresa, importe, fecha, notas) | Sin políticas RLS: solo accesible vía Edge Function con `service_role` |

El historial de tarifas existe porque el resumen mensual necesita saber qué tarifa estaba vigente en la fecha de cada turno, no solo la actual (un cambio de sueldo a mitad de mes no debe recalcular retroactivamente lo ya trabajado).

El SQL de todas las migraciones está versionado en [`supabase/migrations/`](supabase/migrations), y el código de las Edge Functions en [`supabase/functions/`](supabase/functions).

## Funcionalidades

### Vista del jefe
- **Usuarios**: alta de empleados y de otros jefes (genera usuario + PIN inicial), listado.
- **Puestos de trabajo**: alta, edición, activar/desactivar.
- **Calendario**: vista mensual con los turnos de todos los empleados; asignar/editar/eliminar turnos; marcarlos como completados.
- **Incidencias**: todas las de la empresa, con fecha, puesto y empleado; cambiar su estado (pendiente/revisada/resuelta); badge en el menú con el número de pendientes.
- **Tarifas**: tarifa actual por empleado + historial completo; registrar un cambio de tarifa (nunca sobrescribe, añade una nueva entrada).
- **Resumen mensual**: por empleado, horas trabajadas, total a pagar (solo turnos completados, a la tarifa vigente en cada fecha) y previsión del mes si se completan también los turnos aún programados.

### Vista del empleado
- **Mi calendario**: sus propios turnos (puesto + horario, sin verse a sí mismo listado como en la vista del jefe); acceso directo a "Reportar incidencia" desde un turno.
- **Incidencias**: reportar una nueva (opcionalmente ligada a un turno) y ver el estado de las que ha reportado.
- **Mi resumen mensual**: horas planificadas vs. completadas, cuánto va a cobrar ya (turnos completados) y la previsión si completa todo el mes.

Ambos roles pueden cambiar su propio PIN desde la barra superior.

### Vista de desarrolladores

Capa aparte, pensada para quien mantiene la aplicación, no para el personal de las empresas clientas. Vive en `/admin` (login en `/admin/login`, no enlazado desde ningún sitio visible de la app) y usa **email + contraseña reales** (Supabase Auth estándar), no el usuario+PIN del resto de la app — es la cuenta con más privilegios de todo el sistema.

- **Empresas**: alta, edición, y borrado (con confirmación escribiendo el nombre de la empresa, ya que se lleva por delante todos sus usuarios, turnos, tarifas e incidencias).
- **Usuarios de una empresa**: alta de jefes o empleados de cualquier empresa, edición, activar/desactivar, resetear PIN, borrado.
- **Desarrolladores**: alta de otras cuentas de desarrollador, resetear su contraseña, borrado (un desarrollador no puede borrar su propia cuenta).
- **Pausar/reanudar una empresa** (p. ej. por impago): mientras está pausada, ni su jefe ni sus empleados pueden crear ni modificar nada (puestos, tarifas, turnos, incidencias, cambio de PIN) — solo consultar lo que ya existe. El jefe y los empleados ven un aviso explicándolo, y en la vista de jefe se ocultan los botones de crear/editar en vez de dejar que fallen al pulsarlos. Se aplica con políticas RLS (bloquean insert/update/delete, nunca el select) más una comprobación en la Edge Function que da de alta usuarios nuevos. Las empresas que se registran ellas mismas desde `/registro` empiezan pausadas por defecto — el desarrollador las activa manualmente desde el panel.
- **Ingresos**: cada empresa tiene un precio mensual (60€ IVA incluido por defecto, editable por empresa). La pestaña "Ingresos" resume empresas activas/pausadas, el ingreso mensual proyectado (precio de las activas) y los ingresos reales del mes en curso, con gráficas (activas vs. pausadas, precio por empresa, ingresos reales por mes — hechas con CSS puro, sin ninguna librería de gráficas) y una tabla de pagos que el desarrollador introduce a mano (fecha, empresa, importe, notas), sin pasarela de pago automática.

Todas estas operaciones se hacen con `service_role` desde Edge Functions dedicadas (`admin-empresas`, `admin-usuarios`, `admin-desarrolladores`, `admin-pagos`), no ampliando las políticas RLS de `jefe`/`empleado` — un desarrollador nunca consulta las tablas de negocio directamente con su propia sesión.

## Diseño responsive

Toda la app (jefe, empleado y desarrolladores) se adapta a tablet y móvil, sin ninguna librería de UI adicional:

- El menú lateral de cada vista pasa a un menú de hamburguesa superpuesto por debajo de 600px de ancho (`core/layout/responsive.service.ts`, que envuelve `BreakpointObserver` de Angular CDK), y se cierra solo al navegar a otra sección.
- Los diálogos tienen un ancho máximo global (`95vw`, en `app.config.ts`) para no desbordar en pantallas estrechas.
- Las 11 tablas de la app se convierten en móvil en una lista de tarjetas (una fila = una tarjeta, con cada campo apilado y sus acciones abajo) en vez de un scroll horizontal — en tablet/escritorio se sigue viendo la tabla normal.
- El calendario mensual muestra la rejilla habitual en tablet/escritorio, y en móvil pasa a una vista de lista/agenda (un día por fila) — mismo componente (`shared/calendario-mes/`), sin duplicar la lógica de turnos ni el diálogo de detalle del día.

## Estructura del proyecto

```
src/app/
  core/            servicios de datos compartidos (auth, admin, supabase client, turnos, tarifas, incidencias)
  shared/          componentes reutilizables entre jefe y empleado (calendario mensual, selector de mes,
                   diálogo de turnos del día, pipe de formato de fecha, cambiar PIN, confirm-dialog)
  features/
    auth/          login, registro de empresa
    jefe/          usuarios, puestos, calendario, incidencias, tarifas, resumen — y su layout/menú
    empleado/      calendario, incidencias, resumen — y su layout/menú
    admin/         login, empresas, usuarios, desarrolladores — y su layout/menú
supabase/
  migrations/      SQL de cada cambio de esquema, en orden
  functions/       código fuente de las Edge Functions (registrar-empresa, crear-empleado)
```

## Desarrollo

```bash
npm install
ng serve
```

Abre `http://localhost:4200`. La configuración de conexión a Supabase (URL y clave pública) está en `src/environments/environment.ts` — la clave es la `publishable key`, segura para exponer en el cliente porque todo el acceso a datos pasa por RLS.

### Aplicar el esquema a un proyecto Supabase nuevo

Las migraciones en `supabase/migrations/` están pensadas para aplicarse en orden con la [CLI de Supabase](https://supabase.com/docs/guides/cli) (`supabase db push`) o pegándolas una a una en el SQL Editor del dashboard. Las Edge Functions de `supabase/functions/` se despliegan con `supabase functions deploy <nombre>`.

### Comandos de Angular CLI

- `ng build` — compila a `dist/`.
- `ng test` — tests unitarios con Karma.

## Despliegue

La app se publica como sitio estático en **GitHub Pages** (https://devvahlok.github.io/limpiasoft/) mediante `.github/workflows/deploy-pages.yml`: cada push a `main` compila con `ng build --configuration production --base-href /limpiasoft/` y publica `dist/limpiasoft`. El backend sigue siendo el mismo Supabase de siempre (no hay servidor propio que desplegar aparte del build estático).

GitHub Pages no puede redirigir una ruta interna (`/jefe/calendario`) al `index.html` en un refresco directo, así que el workflow copia `index.html` a `404.html` tras compilar: GitHub Pages sirve ese archivo (con estado 404) para cualquier ruta que no exista como archivo, Angular arranca igual y el router lee la ruta real desde la URL — sin necesidad de hash routing, URLs limpias.
