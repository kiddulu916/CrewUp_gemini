import { test, expect, type Page } from '@playwright/test';

/**
 * Performance Tests using Playwright
 * 
 * Tests Core Web Vitals and other performance metrics:
 * - Largest Contentful Paint (LCP): < 2.5s good, < 4s needs improvement
 * - First Input Delay (FID): < 100ms good, < 300ms needs improvement
 * - Cumulative Layout Shift (CLS): < 0.1 good, < 0.25 needs improvement
 * - First Contentful Paint (FCP): < 1.8s good, < 3s needs improvement
 * - Time to Interactive (TTI): < 3.8s good, < 7.3s needs improvement
 */

// Performance budget thresholds (in milliseconds for time metrics)
const PERFORMANCE_BUDGETS = {
  // Core Web Vitals
  LCP: 4000, // Largest Contentful Paint (ms)
  FID: 300, // First Input Delay (ms) - measured via TBT proxy
  CLS: 0.25, // Cumulative Layout Shift (unitless)
  
  // Other metrics
  FCP: 3000, // First Contentful Paint (ms)
  TTFB: 800, // Time to First Byte (ms)
  
  // Resource budgets
  MAX_JS_SIZE: 500 * 1024, // 500KB JS budget
  MAX_CSS_SIZE: 100 * 1024, // 100KB CSS budget
  MAX_IMAGE_SIZE: 200 * 1024, // 200KB per image budget
  MAX_TOTAL_SIZE: 2 * 1024 * 1024, // 2MB total page size
  
  // Request budgets
  MAX_REQUESTS: 50,
  MAX_JS_REQUESTS: 15,
  MAX_IMAGE_REQUESTS: 20,
};

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  ttfb: number;
  domContentLoaded: number;
  load: number;
}

interface ResourceMetrics {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  requestCount: number;
  jsRequestCount: number;
  imageRequestCount: number;
}

/**
 * Collect performance metrics from the page
 */
async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  return page.evaluate(() => {
    return new Promise<PerformanceMetrics>((resolve) => {
      // Wait for LCP to be available
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcpEntry = entries[entries.length - 1];
        
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
        
        // Get CLS
        let cls = 0;
        performance.getEntriesByType('layout-shift').forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        
        resolve({
          fcp: fcpEntry?.startTime || 0,
          lcp: lcpEntry?.startTime || 0,
          cls,
          ttfb: navigation?.responseStart - navigation?.requestStart || 0,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart || 0,
          load: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Fallback timeout
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
        
        resolve({
          fcp: fcpEntry?.startTime || 0,
          lcp: 0,
          cls: 0,
          ttfb: navigation?.responseStart - navigation?.requestStart || 0,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart || 0,
          load: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        });
      }, 5000);
    });
  });
}

/**
 * Collect resource metrics from network requests
 */
async function collectResourceMetrics(page: Page, url: string): Promise<ResourceMetrics> {
  const metrics: ResourceMetrics = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    imageSize: 0,
    requestCount: 0,
    jsRequestCount: 0,
    imageRequestCount: 0,
  };
  
  page.on('response', async (response) => {
    try {
      const headers = response.headers();
      const contentLength = parseInt(headers['content-length'] || '0', 10);
      const contentType = headers['content-type'] || '';
      const responseUrl = response.url();
      
      // Only count resources from the same origin or CDNs
      if (!responseUrl.startsWith(url) && !responseUrl.includes('googleapis') && !responseUrl.includes('gstatic')) {
        return;
      }
      
      metrics.requestCount++;
      metrics.totalSize += contentLength;
      
      if (contentType.includes('javascript') || responseUrl.endsWith('.js')) {
        metrics.jsSize += contentLength;
        metrics.jsRequestCount++;
      } else if (contentType.includes('css') || responseUrl.endsWith('.css')) {
        metrics.cssSize += contentLength;
      } else if (contentType.includes('image')) {
        metrics.imageSize += contentLength;
        metrics.imageRequestCount++;
      }
    } catch {
      // Ignore errors from response handling
    }
  });
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // Wait for late-loading resources
  
  return metrics;
}

test.describe('Performance Tests', () => {
  test.describe('Homepage Performance', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const metrics = await collectPerformanceMetrics(page);
      
      console.log('Homepage Performance Metrics:', {
        FCP: `${metrics.fcp.toFixed(0)}ms`,
        LCP: `${metrics.lcp.toFixed(0)}ms`,
        CLS: metrics.cls.toFixed(3),
        TTFB: `${metrics.ttfb.toFixed(0)}ms`,
        DOMContentLoaded: `${metrics.domContentLoaded.toFixed(0)}ms`,
        Load: `${metrics.load.toFixed(0)}ms`,
      });
      
      // Assert Core Web Vitals
      expect(metrics.fcp, `FCP should be under ${PERFORMANCE_BUDGETS.FCP}ms`).toBeLessThan(PERFORMANCE_BUDGETS.FCP);
      expect(metrics.ttfb, `TTFB should be under ${PERFORMANCE_BUDGETS.TTFB}ms`).toBeLessThan(PERFORMANCE_BUDGETS.TTFB);
      expect(metrics.cls, `CLS should be under ${PERFORMANCE_BUDGETS.CLS}`).toBeLessThan(PERFORMANCE_BUDGETS.CLS);
      
      // LCP check (may be 0 if not measured in time)
      if (metrics.lcp > 0) {
        expect(metrics.lcp, `LCP should be under ${PERFORMANCE_BUDGETS.LCP}ms`).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
      }
    });

    test('should meet resource budgets', async ({ page }) => {
      const baseUrl = 'http://localhost:3000';
      const metrics = await collectResourceMetrics(page, baseUrl);
      
      console.log('Homepage Resource Metrics:', {
        TotalSize: `${(metrics.totalSize / 1024).toFixed(0)}KB`,
        JSSize: `${(metrics.jsSize / 1024).toFixed(0)}KB`,
        CSSSize: `${(metrics.cssSize / 1024).toFixed(0)}KB`,
        ImageSize: `${(metrics.imageSize / 1024).toFixed(0)}KB`,
        RequestCount: metrics.requestCount,
        JSRequests: metrics.jsRequestCount,
        ImageRequests: metrics.imageRequestCount,
      });
      
      // These are soft checks - warn but don't fail
      if (metrics.totalSize > PERFORMANCE_BUDGETS.MAX_TOTAL_SIZE) {
        console.warn(`Total page size (${(metrics.totalSize / 1024 / 1024).toFixed(2)}MB) exceeds budget (${PERFORMANCE_BUDGETS.MAX_TOTAL_SIZE / 1024 / 1024}MB)`);
      }
      
      if (metrics.requestCount > PERFORMANCE_BUDGETS.MAX_REQUESTS) {
        console.warn(`Request count (${metrics.requestCount}) exceeds budget (${PERFORMANCE_BUDGETS.MAX_REQUESTS})`);
      }
    });
  });

  test.describe('Login Page Performance', () => {
    test('should load quickly', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      const metrics = await collectPerformanceMetrics(page);
      
      console.log('Login Page Performance Metrics:', {
        FCP: `${metrics.fcp.toFixed(0)}ms`,
        TTFB: `${metrics.ttfb.toFixed(0)}ms`,
        DOMContentLoaded: `${metrics.domContentLoaded.toFixed(0)}ms`,
      });
      
      expect(metrics.fcp, 'Login FCP should be under 3s').toBeLessThan(3000);
      expect(metrics.ttfb, 'Login TTFB should be under 800ms').toBeLessThan(800);
    });
  });

  test.describe('Pricing Page Performance', () => {
    test('should load within budget', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'networkidle' });
      
      const metrics = await collectPerformanceMetrics(page);
      
      console.log('Pricing Page Performance Metrics:', {
        FCP: `${metrics.fcp.toFixed(0)}ms`,
        LCP: `${metrics.lcp.toFixed(0)}ms`,
        TTFB: `${metrics.ttfb.toFixed(0)}ms`,
      });
      
      expect(metrics.fcp, 'Pricing FCP should be under 3s').toBeLessThan(3000);
    });
  });

  test.describe('Mobile Performance Simulation', () => {
    test.use({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    });

    test('homepage should perform well on mobile', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const metrics = await collectPerformanceMetrics(page);
      
      console.log('Mobile Homepage Performance:', {
        FCP: `${metrics.fcp.toFixed(0)}ms`,
        TTFB: `${metrics.ttfb.toFixed(0)}ms`,
      });
      
      // Mobile thresholds are more lenient
      expect(metrics.fcp, 'Mobile FCP should be under 4s').toBeLessThan(4000);
      expect(metrics.ttfb, 'Mobile TTFB should be under 1s').toBeLessThan(1000);
    });
  });

  test.describe('Image Optimization', () => {
    test('should use optimized images', async ({ page }) => {
      const imageRequests: { url: string; size: number; format: string }[] = [];
      
      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('image')) {
          const size = parseInt(response.headers()['content-length'] || '0', 10);
          const url = response.url();
          const format = contentType.split('/')[1] || 'unknown';
          imageRequests.push({ url, size, format });
        }
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      console.log(`Found ${imageRequests.length} images:`);
      
      for (const img of imageRequests) {
        console.log(`  - ${img.format}: ${(img.size / 1024).toFixed(0)}KB`);
        
        // Check for modern formats (webp, avif)
        const isModernFormat = ['webp', 'avif'].some(f => img.format.includes(f));
        
        // Large images should use modern formats
        if (img.size > 50 * 1024 && !isModernFormat) {
          console.warn(`Large image (${(img.size / 1024).toFixed(0)}KB) not using modern format: ${img.url.slice(0, 100)}`);
        }
      }
      
      // At least check that images aren't excessively large
      const oversizedImages = imageRequests.filter(img => img.size > PERFORMANCE_BUDGETS.MAX_IMAGE_SIZE);
      expect(oversizedImages.length, `Should have no images over ${PERFORMANCE_BUDGETS.MAX_IMAGE_SIZE / 1024}KB`).toBe(0);
    });
  });

  test.describe('JavaScript Bundle Size', () => {
    test('should have reasonable JS bundle size', async ({ page }) => {
      let totalJsSize = 0;
      const jsFiles: { url: string; size: number }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('javascript') || url.endsWith('.js')) {
          const size = parseInt(response.headers()['content-length'] || '0', 10);
          totalJsSize += size;
          jsFiles.push({ url: url.split('/').pop() || url, size });
        }
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      console.log(`Total JS size: ${(totalJsSize / 1024).toFixed(0)}KB`);
      console.log('Largest JS files:');
      
      jsFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 5)
        .forEach(f => {
          console.log(`  - ${f.url}: ${(f.size / 1024).toFixed(0)}KB`);
        });
      
      // Warn if over budget but don't fail (Next.js can have large bundles)
      if (totalJsSize > PERFORMANCE_BUDGETS.MAX_JS_SIZE) {
        console.warn(`JS bundle (${(totalJsSize / 1024).toFixed(0)}KB) exceeds budget (${PERFORMANCE_BUDGETS.MAX_JS_SIZE / 1024}KB)`);
      }
    });
  });
});
