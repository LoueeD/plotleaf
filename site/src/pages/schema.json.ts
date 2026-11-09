import type { APIRoute } from 'astro';
import schema from '../../../schema/components.json?raw';

export const prerender = true;
export const GET: APIRoute = () => new Response(schema, {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
