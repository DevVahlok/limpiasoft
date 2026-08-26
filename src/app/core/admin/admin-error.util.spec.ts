import { FunctionsError } from '@supabase/supabase-js';

import { mensajeError } from './admin-error.util';

function errorConRespuesta(body: unknown, mensajeGenerico = 'Edge Function returned a non-2xx status code'): FunctionsError {
  const response = new Response(JSON.stringify(body), { status: 400 });
  return { name: 'FunctionsHttpError', message: mensajeGenerico, context: response } as unknown as FunctionsError;
}

describe('mensajeError', () => {
  it('extrae el campo "error" del body JSON de la respuesta', async () => {
    const error = errorConRespuesta({ error: 'El PIN debe tener 4 dígitos.' });
    expect(await mensajeError(error)).toBe('El PIN debe tener 4 dígitos.');
  });

  it('usa el mensaje genérico si el body no es JSON válido', async () => {
    const response = new Response('no es json', { status: 500 });
    const error = { name: 'FunctionsHttpError', message: 'mensaje genérico', context: response } as unknown as FunctionsError;
    expect(await mensajeError(error)).toBe('mensaje genérico');
  });

  it('usa el mensaje genérico si el body es JSON pero sin campo "error" de tipo string', async () => {
    const error = errorConRespuesta({ ok: false });
    expect(await mensajeError(error)).toBe('Edge Function returned a non-2xx status code');
  });

  it('usa error.message si context no es una Response', async () => {
    const error = { name: 'FunctionsFetchError', message: 'fallo de red', context: undefined } as unknown as FunctionsError;
    expect(await mensajeError(error)).toBe('fallo de red');
  });
});
