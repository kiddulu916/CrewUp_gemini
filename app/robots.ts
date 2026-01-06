import { MetadataRoute } from 'next';

/**
 * Generate robots.txt for SEO
 * 
 * * Allows all crawlers for public pages
 * * Disallows dashboard and admin areas
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://krewup.net';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/onboarding/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

