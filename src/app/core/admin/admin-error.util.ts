import { FunctionsError } from '@supabase/supabase-js';

/** El mensaje de FunctionsHttpError es genérico; el mensaje real va en el body JSON de la respuesta. */
export async function mensajeError(error: FunctionsError): Promise<string> {
  if (error.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === 'string') {
        return body.error;
      }
    } catch {
      // el body no era JSON; se usa el mensaje genérico
    }
  }
  return error.message;
}
