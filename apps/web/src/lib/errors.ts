// src/lib/errors.ts
// Extrait un message lisible depuis une erreur axios/NestJS
// class-validator renvoie souvent un tableau de messages

export function getErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const anyErr = err as any;
  const message = anyErr?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  return fallback;
}
