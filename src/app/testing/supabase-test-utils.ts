/**
 * Utilidades comunes para simular el cliente de Supabase en tests unitarios,
 * sin depender de una base de datos real ni de red.
 *
 * Los servicios de la app llaman a `.from(tabla).select().eq()...` con un
 * número variable de métodos encadenados según el caso, y siempre terminan
 * haciendo `await` sobre el resultado. `fakeQueryResult` crea un objeto que
 * acepta cualquier método encadenado (select, insert, update, delete, eq,
 * order, single...) devolviéndose a sí mismo, y que además es "thenable":
 * al hacer `await` sobre él, resuelve a `{ data, error }`. Así un mismo helper
 * sirve para cualquier cadena de la app sin tener que listar cada método.
 */
export function fakeQueryResult<T>(data: T, error: unknown = null): any {
  const resolveTo = (resolve: (value: { data: T; error: unknown }) => void, reject?: (reason: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve, reject);

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return resolveTo;
      }
      if (prop === Symbol.toPrimitive || typeof prop === 'symbol') {
        return undefined;
      }
      return (..._args: unknown[]) => proxy;
    },
  };
  const proxy: any = new Proxy({}, handler);
  return proxy;
}

export interface FakeSupabaseAuth {
  getSession: jasmine.Spy;
  onAuthStateChange: jasmine.Spy;
  signInWithPassword: jasmine.Spy;
  signUp: jasmine.Spy;
  signOut: jasmine.Spy;
  updateUser: jasmine.Spy;
}

export interface FakeSupabaseClient {
  from: jasmine.Spy;
  functions: { invoke: jasmine.Spy };
  auth: FakeSupabaseAuth;
}

/** Cliente falso con valores por defecto neutros; cada test sobreescribe lo que necesite con `.and.resolveTo(...)` / `.and.returnValue(...)`. */
export function createFakeSupabaseClient(): FakeSupabaseClient {
  return {
    from: jasmine.createSpy('from').and.returnValue(fakeQueryResult(null)),
    functions: {
      invoke: jasmine.createSpy('invoke').and.resolveTo({ data: null, error: null }),
    },
    auth: {
      getSession: jasmine.createSpy('getSession').and.resolveTo({ data: { session: null } }),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange'),
      signInWithPassword: jasmine.createSpy('signInWithPassword').and.resolveTo({ data: {}, error: null }),
      signUp: jasmine.createSpy('signUp').and.resolveTo({ data: {}, error: null }),
      signOut: jasmine.createSpy('signOut').and.resolveTo({ error: null }),
      updateUser: jasmine.createSpy('updateUser').and.resolveTo({ error: null }),
    },
  };
}

/** Objeto a inyectar con `{ provide: SupabaseService, useValue: fakeSupabaseService(...) }`. */
export function fakeSupabaseService(client: FakeSupabaseClient = createFakeSupabaseClient()): { client: FakeSupabaseClient } {
  return { client };
}
