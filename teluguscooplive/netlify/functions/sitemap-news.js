/*
  ════════════════════════════════════════════════════════════
  TeluguScoopLive — Google News Sitemap (Dynamic)
  URL: https://teluguscooplive.com/sitemap-news.xml

  HOW IT WORKS:
  - Google News visits this URL every few minutes
  - This function queries Supabase for articles from last 48 hours
  - Returns fresh XML with all recent articles
  - Google then indexes those articles in Google News
  ════════════════════════════════════════════════════════════
*/

const SUPABASE_URL = 'https://tunyhhcecpdewffcjaxx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1bnloaGNlY3BkZXdmZmNqYXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODU5MDEsImV4cCI6MjA4NzY2MTkwMX0.wLhHHConJ0mPyVHwQ2ARErv6G9FAtVCymoeOfUwS-qM';
const SITE_URL    = 'https://teluguscooplive.com';

exports.handler = async function(event, context) {

  try {
    // ── 1. Calculate 48 hours ago ─────────────────────────
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    const cutoffISO = cutoff.toISOString();

    // ── 2. Fetch recent articles from Supabase ────────────
    const apiUrl = `${SUPABASE_URL}/rest/v1/articles`
      + `?select=id,title,category,created_at,published_at`
      + `&published=eq.true`
      + `&or=(created_at.gte.${cutoffISO},published_at.gte.${cutoffISO})`
      + `&order=created_at.desc`
      + `&limit=100`;

    const response = await fetch(apiUrl, {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const articles = await response.json();

    // ── 3. Build XML entries ──────────────────────────────
    const urlEntries = articles.map(article => {

      const date      = article.published_at || article.created_at;
      const isoDate   = new Date(date).toISOString();
      const title     = escapeXml(article.title || 'TeluguScoopLive Article');
      const articleId = article.id;
      const category  = article.category || 'national';

      // Keywords based on category
      const keywordMap = {
        politics:  'telugu politics, andhra pradesh, telangana, రాజకీయాలు',
        cinema:    'telugu cinema, tollywood, movies, సినిమా',
        sports:    'telugu sports, cricket, IPL, క్రీడలు',
        telangana: 'telangana news, hyderabad, తెలంగాణ',
        andhra:    'andhra pradesh news, amaravati, ఆంధ్రప్రదేశ్',
        national:  'india news, national, జాతీయం',
        localnews: 'local news, district news, స్థానిక వార్తలు',
      };
      const keywords = keywordMap[category] || 'telugu news, తెలుగు వార్తలు';

      return `
  <url>
    <loc>${SITE_URL}/article/${articleId}</loc>
    <news:news>
      <news:publication>
        <news:name>TeluguScoopLive</news:name>
        <news:language>te</news:language>
      </news:publication>
      <news:publication_date>${isoDate}</news:publication_date>
      <news:title>${title}</news:title>
      <news:keywords>${keywords}</news:keywords>
    </news:news>
  </url>`;
    }).join('');

    // ── 4. Wrap in XML ────────────────────────────────────
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`;

    // ── 5. Return response ────────────────────────────────
    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=300', // Cache 5 minutes
        'X-Robots-Tag':  'noindex',             // Don't index the sitemap itself
      },
      body: xml,
    };

  } catch (err) {
    console.error('[sitemap-news] Error:', err.message);

    // Return empty but valid sitemap on error (don't crash Google)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`,
    };
  }
};

// ── Helper: escape special XML characters ─────────────────
function escapeXml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}
