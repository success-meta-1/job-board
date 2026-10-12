export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|src$|gclid$|fbclid$|lever-|_gl$)/i.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.toLowerCase();
    u.pathname = u.pathname.replace(/\/(apply|application)\/?$/i, '').replace(/\/+$/, '') || '/';
    return u.toString();
  } catch {
    return url;
  }
}
