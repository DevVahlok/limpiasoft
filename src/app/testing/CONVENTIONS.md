# Convenciones para tests unitarios (Karma + Jasmine)

Este proyecto usa el runner por defecto de Angular (Karma + Jasmine + ChromeHeadless). Antes de escribir specs nuevos, lee esto entero y mira los ejemplos ya verificados (pasan `ng test` en verde) que se listan al final.

## Regla de oro

**No inventes patrones nuevos.** Busca el archivo más parecido a lo que vas a testear en la lista de "Ejemplos verificados" de abajo, ábrelo, y copia su estructura. Casi todo en esta app cae en uno de esos moldes.

## 1. Mockear Supabase

Nunca toques la red ni una base de datos real. Usa `src/app/testing/supabase-test-utils.ts`:

```ts
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';

let client: FakeSupabaseClient;
client = createFakeSupabaseClient();
TestBed.configureTestingModule({
  providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
});
```

- Para servicios que llaman a `.from(tabla).select()...`: `client.from.and.returnValue(fakeQueryResult(datos, error))`. `fakeQueryResult` acepta cualquier cadena de métodos (select, eq, order, single...) sin tener que listarlos.
- Para servicios que llaman a `.functions.invoke('nombre-funcion', { body })` (el patrón de todos los `admin-*.service.ts`): `client.functions.invoke.and.resolveTo({ data: {...}, error: null })`, y comprueba la llamada con `expect(client.functions.invoke).toHaveBeenCalledWith('nombre-funcion', { body: {...} })`.
- Para Auth (`auth.service.ts`, `admin-auth.service.ts`): usa `client.auth.signInWithPassword`, `client.auth.signOut`, `client.auth.getSession`, `client.auth.updateUser` (ya vienen con spies por defecto en `createFakeSupabaseClient()`).

## 2. Servicios que dependen de OTROS servicios (no de Supabase directamente)

Ejemplo: `resumen-mensual.component.ts` depende de `EmpleadosService`, `TurnosService`, etc., no de Supabase directamente. En ese caso NO uses el fake de Supabase: mockea esos servicios directamente con `jasmine.createSpyObj('NombreServicio', ['metodo1', 'metodo2'])` y configura cada método con `.and.resolveTo(...)` / `.and.rejectWith(...)`.

**Cuidado con `.and.rejectWith(...)`**: en este proyecto dio problemas de timing en algún caso. Si un test que depende de un rechazo falla de forma rara (el `catch` no parece ejecutarse), cambia a `.and.callFake(() => Promise.reject(new Error('mensaje')))`, que es más explícito y fiable.

## 3. ⚠️ Componentes que usan `MatDialog` o `MatSnackBar` — LA TRAMPA MÁS IMPORTANTE

Si un componente **importa** `MatDialogModule` o `MatSnackBarModule` en su propio `@Component({ imports: [...] })` (case casi todos los componentes con diálogos o snackbars de error), un `{ provide: MatDialog, useValue: miMock }` puesto en `TestBed.configureTestingModule({ providers: [...] })` **NO tiene efecto** — Angular Material declara `MatDialog`/`MatSnackBar` con `providedIn: SuPropioModule` (no `'root''`), así que el propio `imports` del componente crea una instancia REAL que tapa tu mock. El síntoma es sutil: o bien un crash tipo `NG05105` / `Cannot read properties of undefined ('push')`, o (peor) el test falla con "spy nunca llamado" sin ningún error visible, porque el snackbar/diálogo REAL se abrió en silencio.

**Solución obligatoria**: además del provider normal, sobreescribe el propio componente:

```ts
TestBed.configureTestingModule({
  imports: [MiComponente],
  providers: [
    provideNoopAnimations(), // ver punto 4
    { provide: MatDialog, useValue: dialog },
    { provide: MatSnackBar, useValue: snackBar },
    // ... el resto de tus mocks
  ],
});
TestBed.overrideComponent(MiComponente, {
  add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
});
fixture = TestBed.createComponent(MiComponente);
```

Aplica el `overrideComponent` para `MatDialog` y `MatSnackBar` en **todo** componente que inyecte cualquiera de los dos, aunque el test en concreto no parezca necesitarlo — es más barato añadirlo siempre que depurar el fallo silencioso más tarde.

## 4. Componentes que renderizan Angular Material: `provideNoopAnimations()`

Cualquier componente que haga `fixture.detectChanges()` sobre una plantilla con `mat-form-field`, `mat-select`, un diálogo, un snackbar, etc. necesita animaciones configuradas o Angular lanza `NG05105`. Añade siempre a los providers:

```ts
import { provideNoopAnimations } from '@angular/platform-browser/animations';
// ...
providers: [provideNoopAnimations(), /* ... */]
```

## 5. Guards funcionales (`CanActivateFn`)

Se ejecutan con `TestBed.runInInjectionContext(() => miGuard({} as never, {} as never))`. Necesitas `provideRouter([])` en los providers para poder inyectar `Router` (usado para comparar con `router.parseUrl(...)`). Mockea el servicio de auth correspondiente con un signal real (`signal<Profile | null>(null)`), no con un valor estático, para poder cambiarlo entre asserts dentro del mismo test si hace falta.

## 6. Pipes y funciones puras (`*.util.ts`)

Sin TestBed. Instancia la clase directamente (`new FechaEsPipe()`) o importa la función y llama a `expect(fn(...)).toBe(...)`. Cubre casos límite reales del propio código (fechas bisiestas, valores null/undefined, strings vacíos) — no inventes casos que el código no maneja.

## 7. `ControlValueAccessor` (inputs custom tipo `pin-input`)

Testea `writeValue`, `registerOnChange`/`registerOnTouched` (con spies), `setDisabledState`, y los métodos de interacción del propio componente (`onInput`, `onKeydown`, `onPaste`...) llamándolos directamente con eventos simulados (`{ target: { value: 'x' } } as unknown as Event`), sin necesidad de un `<form>` real alrededor.

## 8. Componentes de diálogo (`MAT_DIALOG_DATA` + `MatDialogRef`)

Mockea `MatDialogRef` con `jasmine.createSpyObj('MatDialogRef', ['close'])` y provee `MAT_DIALOG_DATA` con el objeto de datos que espera el diálogo. Si el diálogo tiene un `mat-form-field` (p. ej. un campo de texto de confirmación), no olvides `provideNoopAnimations()` (punto 4).

## 9. Qué NO testear

- Interfaces/tipos puros (`*.models.ts`): no tienen código en tiempo de ejecución.
- Archivos de rutas (`*.routes.ts`) y `app.config.ts`: son arrays de configuración declarativa.
- No dupliques cobertura: si un componente de lista y su formulario ya prueban el mismo servicio a fondo, no hace falta re-probar el servicio otra vez con los mismos casos.

## 10. Cómo verificar

```bash
npx tsc -p tsconfig.spec.json --noEmit   # compila los specs sin arrancar Karma (rápido, seguro en paralelo)
npx ng test --watch=false --browsers=ChromeHeadless   # suite completa (NO lo lances en paralelo con otros procesos: usa el puerto 9876 de Karma y puede chocar)
```

## Ejemplos verificados (ya pasan `ng test` en verde — cópialos)

| Patrón | Archivo |
|---|---|
| Función pura / util | `src/app/core/turnos/fecha.util.spec.ts`, `src/app/core/admin/admin-error.util.spec.ts` |
| Pipe | `src/app/shared/pipes/fecha-es.pipe.spec.ts` |
| Guard funcional | `src/app/core/auth/auth.guard.spec.ts`, `src/app/core/auth/role.guard.spec.ts`, `src/app/core/admin/admin.guard.spec.ts` |
| Servicio, tabla directa de Supabase | `src/app/core/turnos/turnos.service.spec.ts` |
| Servicio, Edge Function (`op: 'list'/'create'/...`) | `src/app/core/admin/admin-empresas.service.spec.ts` |
| Servicio, flujo de Auth (login/logout/signals) | `src/app/core/auth/auth.service.spec.ts` |
| Servicio basado en un Observable (BreakpointObserver) | `src/app/core/layout/responsive.service.spec.ts` |
| Componente de diálogo simple | `src/app/shared/confirm-dialog/confirm-dialog.component.spec.ts` |
| `ControlValueAccessor` | `src/app/shared/pin-input/pin-input.component.spec.ts` |
| Componente con lógica de negocio + MatDialog + MatSnackBar (el caso más completo) | `src/app/features/jefe/resumen/resumen-mensual.component.spec.ts` |
