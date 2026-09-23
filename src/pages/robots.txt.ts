import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/lib/url';

/**
 * Fase 1: staat op shop.reviewplus.io/robots.txt.
 * Fase 2 (/shop op www): de robots.txt van de hoofdsite is leidend; neem de Sitemap-regel daar over.
 */
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'];

export const GET: APIRoute = () => {
  const lines = [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${new URL(absoluteUrl('/bedankt')).pathname}`,
    '',
    ...AI_CRAWLERS.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', '']),
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
