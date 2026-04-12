// backend/src/utils/filters.util.js
// VERSION FINALE UNIVERSELLE

// ═══════════════════════════════════════════════════════════
// DOMAINES TOUJOURS EXCLUS
// ═══════════════════════════════════════════════════════════
const EXCLUDED_DOMAINS = [
  // Réseaux sociaux
  'facebook.com', 'linkedin.com', 'twitter.com', 'x.com',
  'instagram.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
  'snapchat.com', 'whatsapp.com', 'telegram.org',
  // Moteurs de recherche
  'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
  // Encyclopédies
  'wikipedia.org', 'wikimedia.org', 'wikihow.com',
  // Plateformes de contenu
  'medium.com', 'substack.com', 'wordpress.com', 'blogger.com',
  'reddit.com', 'quora.com', 'stackoverflow.com',
  'github.com', 'gitlab.com', 'slideshare.net',
  // Stores applications
  'apps.apple.com', 'play.google.com', 'apple.com',
  'aptoide.com',        // ✅ store apps alternatif
  // Plateformes tech génériques
  'wix.com', 'squarespace.com'
];

// ═══════════════════════════════════════════════════════════
// SEGMENTS URL NON-ENTREPRISE
// ═══════════════════════════════════════════════════════════
const EXCLUDED_URL_SEGMENTS = [
  '/blog/', '/article/', '/articles/',
  '/news/', '/actualite/', '/actualites/',
  '/post/', '/posts/',
  '/comparatif/', '/vs-', '/versus-',
  '/plateformes-', '/liste-', '/top-',
  '/societes-', '/companies-', '/entreprises-',
  '/forum/', '/tag/', '/category/', '/author/',
  '/startups/', '/incubateur/', '/accelerateur/',
  '/feed/', '/rss/', '/search/'
];

// ═══════════════════════════════════════════════════════════
// MOTS DOMAINE = BLOG/ANNUAIRE
// ═══════════════════════════════════════════════════════════
const EXCLUDED_DOMAIN_KEYWORDS = [
  'blog', 'blogs', 'blogspot',
  'magazine', 'media', 'presse', 'journal',
  'actu', 'news', 'forum',
  'wiki', 'wikia', 'fandom',
  'annuaire', 'directory', 'repertoire',
  'embassy', 'ambassade'  // ✅ sites d'ambassades
];

// ═══════════════════════════════════════════════════════════
// TITRES SUSPECTS = ARTICLE/LISTE
// ═══════════════════════════════════════════════════════════
const EXCLUDED_TITLE_KEYWORDS = [
  'télécharger', 'download', 'app store', 'play store',
  'les meilleures', 'les meilleurs',
  'top 10', 'top 5', 'top 20', 'top 3',
  'notre sélection', 'notre guide',
  'notre avis', 'notre liste',
  'le guide', 'le comparatif', 'le classement',
  'comment faire', 'comment créer',
  'comment ouvrir', 'comment choisir',
  'tout savoir sur',
  'que choisir', 'versus', 'comparaison entre',
  'annuaire des', 'liste des', 'répertoire des',
  'trouver un', 'trouver une'
];

// ═══════════════════════════════════════════════════════════
// PATTERNS B2B
// ═══════════════════════════════════════════════════════════
const B2B_UNIVERSAL_PATTERNS = [
  'pour les entreprises', 'pour entreprises',
  'for businesses', 'for companies', 'for enterprises',
  'للشركات', 'للمتاجر', 'للمهنيين',
  ' saas', 'b2b',
  'logiciel de gestion', 'enterprise solution',
  'gérez votre entreprise', 'manage your business',
  'abonnement entreprise', 'enterprise plan',
  'devenez partenaire', 'become a partner',
  'supply chain', 'gestion des stocks',
  'white label', 'marque blanche'
];

// ═══════════════════════════════════════════════════════════
// EXTENSIONS VALIDES
// ═══════════════════════════════════════════════════════════
const VALID_EXTENSIONS = [
  '.com', '.tn', '.fr', '.net', '.org',
  '.io', '.co', '.ma', '.dz', '.be', '.ch',
  '.uk', '.us', '.ca', '.de', '.es', '.it',
  '.app', '.tech', '.digital', '.online',
  '.store', '.shop', '.ai', '.dev'
];

// ═══════════════════════════════════════════════════════════
// FILTRE PRINCIPAL — 100% UNIVERSEL
// ═══════════════════════════════════════════════════════════
function filterResults(results, projectKeywords = [], industryTerms = []) {

  const normalizedKeywords = projectKeywords
    .map(k => k.toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''))
    .filter(k => k.length > 2);

  const normalizedTerms = industryTerms
    .map(t => t.toLowerCase().trim())
    .filter(t => t.length > 1);

  return results.filter(result => {
    try {
      const url      = new URL(result.url);
      const domain   = url.hostname.replace(/^www\./, '').toLowerCase();
      const pathname = url.pathname.toLowerCase();
      const title    = (result.title   || '').toLowerCase();
      const snippet  = (result.snippet || '').toLowerCase();

      // ── RÈGLE 1 — Domaines toujours exclus ──
      const isDomainExcluded = EXCLUDED_DOMAINS.some(excluded =>
        domain === excluded || domain.endsWith('.' + excluded)
      );
      if (isDomainExcluded) {
        console.log(`  ⏭️  Exclu (domaine blacklisté): ${domain}`);
        return false;
      }

      // ── RÈGLE 2 — Sites gouvernementaux ──
      // Jamais des concurrents directs pour aucun projet
      if (domain.endsWith('.gov') ||
          domain.includes('.gov.') ||
          domain.includes('usembassy') ||
          domain.includes('embassy')) {
        console.log(`  ⏭️  Exclu (site gouvernemental): ${domain}`);
        return false;
      }

      // ── RÈGLE 3 — Segments URL non-entreprise ──
      const isBadUrl = EXCLUDED_URL_SEGMENTS.some(segment =>
        pathname.includes(segment)
      );
      if (isBadUrl) {
        console.log(`  ⏭️  Exclu (URL article/annuaire): ${domain}${pathname}`);
        return false;
      }

      // ── RÈGLE 4 — URL trop profonde (> 2 niveaux) ──
      const pathSegments = pathname.split('/').filter(s => s.length > 0);
      if (pathSegments.length > 2) {
        console.log(`  ⏭️  Exclu (URL trop profonde): ${domain}${pathname}`);
        return false;
      }

      // ── RÈGLE 5 — Slug article (6+ tirets) ──
      if (pathSegments.length === 1) {
        const hyphenCount = (pathSegments[0].match(/-/g) || []).length;
        if (hyphenCount >= 6) {
          console.log(`  ⏭️  Exclu (slug article): ${domain}${pathname}`);
          return false;
        }
      }

      // ── RÈGLE 6 — Domaine = blog/annuaire/ambassade ──
      const isDomainBlog = EXCLUDED_DOMAIN_KEYWORDS.some(keyword =>
        domain.includes(keyword)
      );
      if (isDomainBlog) {
        console.log(`  ⏭️  Exclu (domaine blog/annuaire): ${domain}`);
        return false;
      }

      // ── RÈGLE 7 — Domaine = keyword générique ──
      if (normalizedKeywords.length > 0) {
        const domainWithoutExt = domain.replace(
          /\.(com|tn|fr|net|org|io|co|ma|dz|be|ch|uk|us|ca|de|es|it|app|tech|digital|online).*$/, ''
        );
        const isGenericDomain = normalizedKeywords.some(kw =>
          domainWithoutExt === kw
        );
        if (isGenericDomain) {
          console.log(`  ⏭️  Exclu (domaine = keyword générique): ${domain}`);
          return false;
        }
      }

      // ── RÈGLE 8 — Titre = article/comparatif ──
      const hasBadTitle = EXCLUDED_TITLE_KEYWORDS.some(keyword =>
        title.includes(keyword.toLowerCase())
      );
      if (hasBadTitle) {
        console.log(`  ⏭️  Exclu (titre suspect): ${title.substring(0, 50)}`);
        return false;
      }

      // ── RÈGLE 9 — Extension invalide ──
      const hasValidExtension = VALID_EXTENSIONS.some(ext =>
        domain.includes(ext)
      );
      if (!hasValidExtension) {
        console.log(`  ⏭️  Exclu (extension invalide): ${domain}`);
        return false;
      }

      // ── RÈGLE 10 — B2B ──
      const textToCheckB2B = `${title} ${snippet}`;
      const matchedB2B = B2B_UNIVERSAL_PATTERNS.find(pattern =>
        textToCheckB2B.includes(pattern)
      );
      if (matchedB2B) {
        console.log(`  ⏭️  Exclu (B2B: "${matchedB2B}"): ${domain}`);
        return false;
      }

      // ── RÈGLE 11 — Score industryTerms ──
      if (normalizedTerms.length > 0) {
        const textToCheck = `${title} ${snippet} ${domain}`;
        const matchCount  = normalizedTerms.filter(term =>
          textToCheck.includes(term)
        ).length;

        if (matchCount === 0) {
          console.log(`  ⏭️  Exclu (0/${normalizedTerms.length} terms matchés): ${domain}`);
          return false;
        }
        console.log(`  ✅ Gardé (${matchCount}/${normalizedTerms.length} terms): ${domain}`);
      } else {
        console.log(`  ✅ Gardé: ${domain}`);
      }

      return true;

    } catch (error) {
      console.error(`  ❌ Erreur filtrage: ${error.message}`);
      return false;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// DÉDUPLICATION PAR DOMAINE
// ═══════════════════════════════════════════════════════════
function deduplicateByDomain(results) {
  const seen = new Set();
  return results.filter(result => {
    const domain = result.domain.toLowerCase().replace(/^www\./, '');
    if (seen.has(domain)) {
      console.log(`  ⏭️  Doublon ignoré: ${domain}`);
      return false;
    }
    seen.add(domain);
    return true;
  });
}

// ═══════════════════════════════════════════════════════════
// EXTRACTION NOM ENTREPRISE
// ═══════════════════════════════════════════════════════════
function extractCompanyName(title, domain) {
  const IGNORED_SUBDOMAINS = [
    'www', 'app', 'shop', 'store', 'web', 'api',
    'mail', 'blog', 'm', 'mobile', 'static',
    'tn', 'fr', 'en', 'ar', 'de', 'es', 'it',
    'ma', 'dz', 'uk', 'us', 'ca', 'be', 'ch',
    'home', 'accueil', 'index', 'new', 'old', 'v2',
    'portal', 'portail', 'client', 'user', 'admin'
  ];

  let cleanDomain   = domain.replace(/^www\./, '');
  const domainParts = cleanDomain.split('.');

  if (domainParts.length > 2 &&
      IGNORED_SUBDOMAINS.includes(domainParts[0].toLowerCase())) {
    cleanDomain = domainParts.slice(1).join('.');
  }

  const domainName = cleanDomain
    .replace(/\.(com|tn|fr|net|org|io|co|ma|dz|be|ch|uk|us|ca|de|es|it|app|tech|digital|online).*$/, '')
    .replace(/[-_.]/g, ' ')
    .trim();

  let nameFromTitle = title
    .replace(/\s*[|\-–:]\s*.*/s, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[«»""]/g, '')
    .replace(/^\d+\.?\s*/, '')
    .replace(/\b(les?|la|le|des?|du|un|une|the|a|an)\b/gi, '')
    .replace(/\b(meilleur[es]?|top|best|premier[s]?|leading)\b/gi, '')
    .replace(/\b(officiel|official|online|boutique|shop|store|magasin)\b/gi, '')
    .replace(/\b(bienvenue|welcome|accueil|home)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let finalName     = '';
  const domainWords = domainName.split(' ').filter(w => w.length > 1);
  const titleWords  = nameFromTitle.split(' ').filter(w => w.length > 1);

  if (domainWords.length >= 1 && domainWords.length <= 4) {
    finalName = domainName;
  } else if (titleWords.length >= 1 && nameFromTitle.length >= 2) {
    finalName = nameFromTitle;
  } else {
    finalName = domainName;
  }

  finalName = finalName
    .split(' ')
    .filter(w => w.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  if (finalName.length > 60) finalName = finalName.substring(0, 60).trim();
  return finalName || 'Unknown Company';
}

module.exports = { filterResults, deduplicateByDomain, extractCompanyName };