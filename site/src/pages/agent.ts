import type { APIRoute } from 'astro';
import guide from '../../../skills/plotleaf/SKILL.md?raw';

export const prerender = true;
export const GET: APIRoute = () => new Response(guide, {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
