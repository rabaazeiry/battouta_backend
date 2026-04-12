// backend/src/services/classification.service.js
// VERSION FINALE — LLaMA SEUL + 2 règles certaines à 100%

const chromaService = require('./chroma.service');

class ClassificationService {

  constructor() {
    this.ollamaUrl = 'http://localhost:11434/api/generate';
    this.model     = 'llama3.1';
  }

  async classifyCompetitor(competitor, project) {
    try {
      console.log(`\n🤖 Classification: ${competitor.companyName}...`);

      // 2 règles JS seulement — certitude 100% mathématique
      const hardResult = this._applyHardRules(competitor, project);
      if (hardResult) {
        console.log(`   ⚡ Règle JS → ${hardResult.classification} (${hardResult.ruleApplied})`);
        return hardResult;
      }

      // LLaMA décide pour TOUS les autres cas
      const ragContext = await chromaService.retrieveContext(
        competitor.companyName,
        project._id?.toString() || project.id?.toString() || '',
        competitor.website || ''
      );

      if (ragContext) console.log(`   📖 RAG actif pour ${competitor.companyName}`);
      else           console.log(`   ⚠️  Pas de RAG pour ${competitor.companyName}`);

      const prompt   = this._buildPrompt(competitor, project, ragContext);
      const response = await fetch(this.ollamaUrl, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          model  : this.model,
          prompt : prompt,
          stream : false,
          options: { temperature: 0.0, num_predict: 800 }
        })
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
      const data   = await response.json();
      const result = this._parseResponse(data.response);

      console.log(`   ✅ LLaMA → ${result.classification} (score: ${result.classificationScore})`);
      console.log(`   📝 ${result.classificationJustification}`);
      return result;

    } catch (error) {
      console.error(`   ❌ Erreur ${competitor.companyName}: ${error.message}`);
      return this._fallback(competitor, project);
    }
  }

  // ═══════════════════════════════════════════════════════
  // 2 RÈGLES JS — CERTITUDE 100% MATHÉMATIQUE SEULEMENT
  // Pas de logique métier — juste des faits numériques purs
  // ═══════════════════════════════════════════════════════
  _applyHardRules(competitor, project) {
    const followers = this._getTotalFollowers(competitor);

    // RÈGLE 1 — Sous-page pays sur domaine générique
    // Certitude absolue : plateforme.com/tunisia = global
    // Aucune entreprise locale ne crée une sous-page /pays
    if (this._isCountrySubpage(competitor.website)) {
      return {
        classification            : 'international',
        classificationScore       : 0.98,
        classificationJustification: 'Rule 1: generic domain (.com/.io) with country subpage = confirmed global platform',
        ruleApplied               : 'Rule 1: country subpage'
      };
    }

    // RÈGLE 2 — Followers > 500K
    // Certitude absolue : impossible d'avoir 500K+ followers
    // en étant une entreprise locale ou startup
    if (followers > 500000) {
      return {
        classification            : 'international',
        classificationScore       : 0.98,
        classificationJustification: `Rule 2: ${followers.toLocaleString()} followers > 500K = mathematically impossible for local/startup`,
        ruleApplied               : 'Rule 2: followers > 500K'
      };
    }

    // TOUT LE RESTE → LLaMA décide
    return null;
  }

  async classifyAll(competitors, project) {
    console.log(`\n🔍 Classification de ${competitors.length} concurrents...`);
    const results = [];
    for (const competitor of competitors) {
      const result = await this.classifyCompetitor(competitor, project);
      results.push({
        competitorId: competitor._id,
        companyName : competitor.companyName,
        ...result
      });
      await this._sleep(500);
    }
    const ruleCount  = results.filter(r => r.ruleApplied).length;
    const llamaCount = results.filter(r => !r.ruleApplied).length;
    console.log(`\n✅ Terminé: ${results.length} concurrents`);
    console.log(`   ⚡ Règles JS : ${ruleCount} | 🤖 LLaMA : ${llamaCount}`);
    return results;
  }

  // ═══════════════════════════════════════════════════════
  // PROMPT LLAMA — UNIVERSEL
  // Fonctionne pour N'IMPORTE QUEL secteur et pays
  // ═══════════════════════════════════════════════════════
  _buildPrompt(competitor, project, ragContext = '') {

    const tld         = this._extractTld(competitor.website);
    const isLocal     = this._isLocalDomain(tld, project.targetCountry);
    const followers   = this._getTotalFollowers(competitor);
    const foundedYear = this._getFoundedYear(competitor);
    const currentYear = new Date().getFullYear();
    const localDomain = this._getLocalDomainForCountry(project.targetCountry);

    // Texte followers
    const followersText = followers > 0
      ? `${followers.toLocaleString()} total followers`
      : 'No followers data available';

    // Texte âge entreprise
    const ageText = foundedYear
      ? `Founded ${foundedYear} → ${currentYear - parseInt(foundedYear)} years old`
      : 'Founding date unknown — do NOT classify as startup without explicit date';

    // Réseaux sociaux
    const socialList = [];
    if (competitor.socialMedia?.instagram?.username) socialList.push(`Instagram @${competitor.socialMedia.instagram.username}`);
    if (competitor.socialMedia?.facebook?.username)  socialList.push(`Facebook: ${competitor.socialMedia.facebook.username}`);
    if (competitor.socialMedia?.linkedin?.username)  socialList.push(`LinkedIn: ${competitor.socialMedia.linkedin.username}`);
    if (competitor.socialMedia?.tiktok?.username)    socialList.push(`TikTok @${competitor.socialMedia.tiktok.username}`);
    const socialText = socialList.length > 0 ? socialList.join(' | ') : 'No social media found';

    // Description nettoyée
    const desc = (competitor.description || '')
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
      .replace(/https?:\/\/\S+/g,'').replace(/#{1,6}\s/g,'')
      .replace(/\*{1,2}/g,'').replace(/\s+/g,' ').trim()
      .substring(0, 600);
    const descText = desc || 'No description available';

    // Indice domaine
    const domainHint = isLocal
      ? `"${tld}" → local domain specific to ${project.targetCountry}`
      : `"${tld}" → generic international domain`;

    // Section RAG
    const ragSection = ragContext
      ? `── WEB CONTEXT (from Tavily articles) ──
IMPORTANT: Use ONLY if this text mentions "${competitor.companyName}" directly.
If it mentions a DIFFERENT company → ignore completely.
${ragContext}
──────────────────────────────────────`
      : `── WEB CONTEXT: No articles found ──
Rely on competitor data only.
──────────────────────────────────────`;

    return `You are a market intelligence expert. Your task is to classify a competitor company.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Industry      : ${project.industry}
Target Country: ${project.targetCountry}
Local Domain  : ${localDomain}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICATION CATEGORIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"local"         → Small company. Operates in 1 city or region only.
                  Few or no followers. Limited online presence.

"startup"       → REQUIRES explicit founding date < 5 years ago.
                  Innovative approach. Growing but limited reach.
                  ⚠️  NEVER classify as startup if founding date unknown.

"leader"        → Dominant, well-known brand in ${project.targetCountry}.
                  Strong local presence. NOT present in other countries.
                  Can have .com domain if it operates only in ${project.targetCountry}.

"international" → Confirmed presence in 3+ countries.
                  Evidence: "worldwide", "global", "70+ countries",
                  "across Africa", "pan-African", "MENA region" etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DECISION RULES (apply in order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — Check WEB CONTEXT first:
  • mentions "worldwide" / "global" / "X countries" → international
  • mentions "leader in ${project.targetCountry}" / "#1 in ${project.targetCountry}" → leader
  • mentions "launched" / "new platform" / recent launch → startup

STEP 2 — Check DESCRIPTION:
  • mentions multiple countries explicitly → international
  • mentions "leader" / "largest" / "top platform" + ${project.targetCountry} → leader
  • mentions ONLY ${project.targetCountry} cities/regions → leader or local
  • founded < 5 years explicitly stated → startup candidate

STEP 3 — Check FOLLOWERS:
  • 50,000 - 500,000 followers → likely leader (strong local presence)
  • 10,000 - 50,000 followers  → could be leader or growing local
  • < 10,000 followers         → local or startup
  • 0 followers                → local (default)

STEP 4 — Check DOMAIN:
  • Domain ${localDomain} → operates in ${project.targetCountry} → lean toward leader/local
  • Domain .com + ONLY mentions ${project.targetCountry} → still can be leader
  • Domain .com + multi-country evidence → international

STEP 5 — If no clear signal:
  • Default to "local"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ragSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPETITOR DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company     : ${competitor.companyName}
Website     : ${competitor.website || 'N/A'}
Domain hint : ${domainHint}
Description : ${descText}
Founded     : ${ageText}
Social media: ${socialText}
Followers   : ${followersText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR RESPONSE (JSON only, no other text)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "classification": "local" or "startup" or "leader" or "international",
  "score": 0.00,
  "justification": "Which step and signal led to this decision?"
}`;
  }

  // ═══════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════

  _isCountrySubpage(website) {
    if (!website) return false;
    try {
      const parsed   = new URL(website);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();

      const isGenericDomain = /\.(com|net|org|io|co|app|dev|ai)$/.test(hostname);
      if (!isGenericDomain) return false;

      const patterns = [
        /^\/[a-z]{2}\/?$/,
        /^\/[a-z]{2}-[a-z]{2}\/?$/,
        /\/[a-z]+-in-/,
        /\/jobs\b/, /\/freelancers\b/, /\/services\b/,
        /\/hire\b/, /\/experts\b/, /\/talents\b/, /\/workers\b/,
        /\/location\b/, /\/country\b/, /\/region\b/
      ];

      const countryNames = [
        'tunisia','tunisie','morocco','maroc','algeria','algerie',
        'senegal','nigeria','ghana','kenya','ethiopia','cameroon',
        'southafrica','egypt','sudan','congo','mali','ivory',
        'france','germany','spain','italy','portugal','netherlands',
        'belgium','switzerland','austria','sweden','norway','denmark',
        'poland','romania','greece','turkey','russia','ukraine',
        'saudi','emirates','qatar','kuwait','jordan','lebanon','iraq',
        'india','pakistan','bangladesh','china','japan','korea',
        'singapore','malaysia','thailand','vietnam','indonesia','philippines',
        'brazil','mexico','argentina','colombia','chile','peru',
        'canada','australia','newzealand'
      ];

      const segments    = pathname.split('/').filter(s => s.length > 0);
      const hasCountry  = countryNames.some(c => pathname.includes('/' + c));
      const hasPattern  = patterns.some(p => p.test(pathname));
      const hasSubpage  = segments.length >= 1 && segments.length <= 2 &&
        !['about','contact','pricing','login','signup','blog',
          'news','help','terms','privacy','features','solutions',
          'register','faq','team','careers'].includes(segments[0]);

      return hasCountry || hasPattern || (isGenericDomain && hasSubpage && hasCountry);

    } catch { return false; }
  }

  _isLocalDomain(tld, targetCountry) {
    const map = {
      'TN':['.tn'],'MA':['.ma'],'DZ':['.dz'],'LY':['.ly'],'EG':['.eg'],
      'SN':['.sn'],'CI':['.ci'],'CM':['.cm'],'GH':['.gh'],'NG':['.ng'],
      'KE':['.ke'],'ET':['.et'],'TZ':['.tz'],'ZA':['.za'],'RW':['.rw'],
      'UG':['.ug'],'ML':['.ml'],'BF':['.bf'],'NE':['.ne'],'GA':['.ga'],
      'CD':['.cd'],'CG':['.cg'],'BJ':['.bj'],'TG':['.tg'],'MR':['.mr'],
      'FR':['.fr'],'DE':['.de'],'IT':['.it'],'ES':['.es'],'PT':['.pt'],
      'UK':['.uk','.co.uk'],'NL':['.nl'],'BE':['.be'],'CH':['.ch'],
      'AT':['.at'],'SE':['.se'],'NO':['.no'],'DK':['.dk'],'FI':['.fi'],
      'PL':['.pl'],'CZ':['.cz'],'RO':['.ro'],'HU':['.hu'],'GR':['.gr'],
      'TR':['.tr'],'RU':['.ru'],'UA':['.ua'],
      'SA':['.sa'],'AE':['.ae'],'QA':['.qa'],'KW':['.kw'],'JO':['.jo'],
      'LB':['.lb'],'IQ':['.iq'],'IR':['.ir'],
      'IN':['.in'],'PK':['.pk'],'BD':['.bd'],'CN':['.cn'],'JP':['.jp'],
      'KR':['.kr'],'SG':['.sg'],'MY':['.my'],'TH':['.th'],'VN':['.vn'],
      'ID':['.id'],'PH':['.ph'],
      'US':['.us'],'CA':['.ca'],'MX':['.mx'],'BR':['.br'],'AR':['.ar'],
      'CO':['.co'],'CL':['.cl'],'PE':['.pe'],
      'AU':['.au'],'NZ':['.nz']
    };
    return (map[targetCountry] || ['.' + targetCountry.toLowerCase()]).includes(tld);
  }

  _getLocalDomainForCountry(targetCountry) {
    const map = {
      'TN':'.tn','MA':'.ma','DZ':'.dz','EG':'.eg','SN':'.sn',
      'NG':'.ng','GH':'.gh','KE':'.ke','ZA':'.za','CM':'.cm',
      'FR':'.fr','DE':'.de','IT':'.it','ES':'.es','PT':'.pt',
      'UK':'.co.uk','NL':'.nl','BE':'.be','TR':'.tr','RU':'.ru',
      'SA':'.sa','AE':'.ae','QA':'.qa','IN':'.in','PK':'.pk',
      'JP':'.jp','KR':'.kr','SG':'.sg','CN':'.cn','ID':'.id',
      'US':'.us','CA':'.ca','BR':'.br','MX':'.mx','AU':'.au','NZ':'.nz'
    };
    return map[targetCountry] || '.' + targetCountry.toLowerCase();
  }

  _getTotalFollowers(competitor) {
    if (competitor.metrics?.totalFollowers > 0) return competitor.metrics.totalFollowers;
    if (competitor.notes?.includes('Followers:')) {
      const match = competitor.notes.match(/Followers:\s*([\w:,]+)/);
      if (match) {
        return match[1].split(',').reduce((sum, part) => {
          const num = parseInt(part.split(':')[1] || '0');
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
      }
    }
    return 0;
  }

  _getFoundedYear(competitor) {
    if (competitor.notes?.includes('Founded:')) {
      const match = competitor.notes.match(/Founded:\s*(\d{4})/);
      if (match) return match[1];
    }
    return competitor.foundedYear ? String(competitor.foundedYear) : '';
  }

  _countSocials(competitor) {
    return ['instagram','facebook','linkedin','tiktok']
      .filter(p => competitor.socialMedia?.[p]?.username).length;
  }

  _extractTld(website) {
    if (!website) return '.com';
    try {
      const parts = new URL(website).hostname.split('.');
      return '.' + parts[parts.length - 1];
    } catch { return '.com'; }
  }

  _parseResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error('Pas de JSON trouvé');
      const parsed = JSON.parse(jsonMatch[0]);
      if (!['leader','startup','local','international'].includes(parsed.classification))
        throw new Error(`Classification invalide: ${parsed.classification}`);
      const score = parseFloat(parsed.score);
      if (isNaN(score) || score < 0 || score > 1) throw new Error('Score invalide');
      return {
        classification            : parsed.classification,
        classificationScore       : Math.round(score * 100) / 100,
        classificationJustification: parsed.justification || ''
      };
    } catch (error) {
      throw new Error(`Parse échoué: ${error.message}`);
    }
  }

  _fallback(competitor, project) {
    const tld     = this._extractTld(competitor.website);
    const isLocal = this._isLocalDomain(tld, project?.targetCountry || 'TN');
    return {
      classification            : 'local',
      classificationScore       : isLocal ? 0.40 : 0.30,
      classificationJustification: 'Fallback: Ollama unavailable'
    };
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = new ClassificationService();
