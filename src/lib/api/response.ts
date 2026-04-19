export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function error(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

