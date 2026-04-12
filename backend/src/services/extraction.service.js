// backend/src/services/extraction.service.js
// VERSION 8 — Hôtels Tunisie — 15 hôtels ciblés toutes villes

const Groq = require('groq-sdk');

class ExtractionService {

  constructor() {
    this.groq          = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.primaryModel  = 'llama-3.3-70b-versatile';
    this.fallbackModel = 'llama-3.1-8b-instant';
    this.maxRetries    = 2;
    this.timeoutMs     = 30000;
  }

  async extractProjectInfo(businessIdea, marketCategory, competitorsHint = []) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const model = attempt === 1 ? this.primaryModel : this.fallbackModel;

      try {
        console.log(`🤖 Extraction LLM — tentative ${attempt}/${this.maxRetries} (${model})`);

        const extracted = await this._callGroq(businessIdea, marketCategory, competitorsHint, model);

        extracted.industry        = 'Tourism & Hotels';
        extracted.country         = 'Tunisie';
        extracted.marketCategory  = marketCategory;
        extracted.competitorsHint = competitorsHint;

        extracted.keywords      = this._enrichKeywords(extracted.keywords);
        extracted.searchQueries = this._enrichQueries(extracted.searchQueries, competitorsHint);
        extracted.industryTerms = this._getIndustryTerms();

        this._validate(extracted);

        console.log('✅ Extraction LLM réussie:', extracted.name);
        console.log(`   industry       : ${extracted.industry}`);
        console.log(`   marketCategory : ${extracted.marketCategory}`);
        console.log(`   keywords       : ${extracted.keywords.slice(0, 5).join(', ')}...`);
        console.log(`   → ${extracted.searchQueries.length} queries optimisées hôtels`);
        return extracted;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Tentative ${attempt} échouée (${model}):`, error.message);
        if (error.status === 429) console.log('   → Rate limit, switch fallback...');
      }
    }

    throw new Error(`Extraction échouée après ${this.maxRetries} tentatives: ${lastError.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // KEYWORDS — HÔTELS TUNISIE UNIQUEMENT
  // ═══════════════════════════════════════════════════════

  _enrichKeywords(llmKeywords) {
    const HOTEL_KEYWORDS = [
      // FR — types d'hôtels
      'hotel', 'hôtel', 'resort', 'palace', 'spa',
      'thalasso', 'luxe', '5 étoiles', '4 étoiles',
      'séjour', 'bien-être', 'piscine',
      // EN
      'luxury', 'beachfront', 'suites', 'accommodation',
      // AR — hôtels uniquement
      'فندق', 'منتجع', 'إقامة', 'فنادق',
    ];

    // Mots INTERDITS — maisons d'hôtes, boutiques, blogs
    const FORBIDDEN = new Set([
      'tourisme', 'voyage', 'hôtellerie', 'tourism', 'travel',
      'maison', 'dar', 'riad', 'villa', 'gîte', 'chambre',
      'boutique', 'homestay', 'airbnb', 'location',
      'دار', 'منزل', 'شاليه', 'بيت',
      'agence', 'réservation', 'booking',
    ]);

    const combined = new Set([...llmKeywords, ...HOTEL_KEYWORDS]);
    FORBIDDEN.forEach(w => combined.delete(w));

    return Array.from(combined)
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 1)
      .slice(0, 15);
  }

  // ═══════════════════════════════════════════════════════
  // SEARCH QUERIES — 20 QUERIES CIBLÉES SUR LES 15 HÔTELS
  // ═══════════════════════════════════════════════════════

  _enrichQueries(llmQueries, competitorsHint) {
    const queries = [

      // ── TUNIS / GAMMARTH — Instagram ─────────────────────
      'four seasons hotel tunis instagram',
      'the residence tunis gammarth instagram',
      'movenpick hotel lac tunis instagram',
      'movenpick hotel gammarth instagram',
      'sheraton tunis hotel instagram',
      'el mouradi gammarth hotel instagram',

      // ── TUNIS / GAMMARTH — Facebook ──────────────────────
      'four seasons hotel tunis facebook',
      'movenpick lac tunis facebook',
      'sheraton tunis hotel facebook',
      'el mouradi gammarth facebook',

      // ── HAMMAMET ─────────────────────────────────────────
      'hasdrubal thalassa hammamet facebook',
      'radisson blu resort hammamet instagram',
      'laico hotel hammamet facebook',

      // ── SOUSSE ───────────────────────────────────────────
      'movenpick resort marine spa sousse instagram',
      'movenpick sousse facebook',

      // ── MONASTIR ─────────────────────────────────────────
      'hilton skanes monastir instagram',
      'hilton skanes monastir beach resort facebook',

      // ── DJERBA ───────────────────────────────────────────
      'hasdrubal prestige thalassa djerba instagram',
      'hasdrubal prestige djerba facebook',

      // ── TOZEUR ───────────────────────────────────────────
      'anantara sahara tozeur resort instagram',
      'anantara tozeur facebook',

      // ── CHAÎNES MULTI-VILLES ──────────────────────────────
      'el mouradi hotels tunisie instagram',
      'el mouradi hotels tunisie facebook',
      'iberostar tunisia instagram',
      'iberostar tunisie facebook',

      // ── ARABE ─────────────────────────────────────────────
      'فندق تونس انستقرام',
      'فنادق تونسية انستقرام',
      'فندق حمامات انستقرام',
      'فندق سوسة انستقرام',
      'فندق جربة انستقرام',
      'فنادق تونس فيسبوك',

      // ── HINTS UTILISATEUR ─────────────────────────────────
      ...competitorsHint.map(name => `${name} hotel tunisia instagram`),
    ];

    // Dédupliquer + limiter à 20
    return [...new Set(queries)].slice(0, 20);
  }

  // ═══════════════════════════════════════════════════════
  // INDUSTRY TERMS — URLs hôtels tunisiens
  // ═══════════════════════════════════════════════════════

  _getIndustryTerms() {
    return [
      'hotel', 'resort', 'palace', 'spa',
      'thalasso', 'suites', 'فندق', 'منتجع',
    ];
  }

  // ═══════════════════════════════════════════════════════
  // APPEL GROQ
  // ═══════════════════════════════════════════════════════

  async _callGroq(businessIdea, marketCategory, competitorsHint, model) {
    const response = await Promise.race([
      this.groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this._buildSystemPrompt() },
          { role: 'user',   content: this._buildUserPrompt(businessIdea, marketCategory, competitorsHint) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1024,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout Groq API')), this.timeoutMs)
      ),
    ]);

    return this._parseJSON(response.choices[0].message.content);
  }

  // ═══════════════════════════════════════════════════════
  // SYSTEM PROMPT
  // ═══════════════════════════════════════════════════════

  _buildSystemPrompt() {
    return `Tu es un expert en marketing hôtelier pour la Tunisie.

OBJECTIF : Analyser un projet hôtelier et générer des données pour trouver les HÔTELS concurrents en Tunisie sur Instagram et Facebook.

HÔTELS CIBLES en Tunisie (les plus actifs sur réseaux sociaux) :
— Tunis/Gammarth : Four Seasons, The Residence, Movenpick Lac, Movenpick Gammarth, Sheraton, El Mouradi Gammarth
— Hammamet      : Hasdrubal Thalassa, Radisson Blu, Laico Hammamet
— Sousse        : Movenpick Resort & Marine Spa
— Monastir      : Hilton Skanes Monastir
— Djerba        : Hasdrubal Prestige
— Tozeur        : Anantara Sahara
— Chaînes       : El Mouradi Hotels, Iberostar Tunisia

RÈGLE ABSOLUE : Chercher UNIQUEMENT des HÔTELS 4★/5★ avec réception, restaurant, spa.

INTERDIT :
❌ Maisons d'hôtes, riads, dars, villas, gîtes, chambres d'hôtes, airbnb
❌ Agences de voyage, tour-opérateurs, sites de réservation
❌ Mots : tourisme, voyage, réservation, booking (retournent des agrégateurs)

RÈGLES JSON :
- keywords : 8-10 mots hôtels uniquement. Obligatoire : hotel, resort, spa, luxury, فندق
- searchQueries : 6-8 queries. TOUTES contiennent un nom d'hôtel précis + instagram ou facebook
- industryTerms : mots dans URLs d'hôtels (hotel, resort, palace, spa, thalasso, suites)
- targetAudience : clients d'hôtels tunisiens

Réponds UNIQUEMENT en JSON valide.`;
  }

  // ═══════════════════════════════════════════════════════
  // USER PROMPT
  // ═══════════════════════════════════════════════════════

  _buildUserPrompt(businessIdea, marketCategory, competitorsHint) {
    let prompt = `Projet hôtelier à analyser :

Business Idea   : ${businessIdea}
Market Category : ${marketCategory}
Pays            : Tunisie
Villes ciblées  : Tunis, Gammarth, Hammamet, Sousse, Monastir, Djerba, Tozeur`;

    if (competitorsHint.length > 0) {
      prompt += `\n\nHôtels concurrents connus : ${competitorsHint.join(', ')}
→ Intègre ces noms dans les searchQueries`;
    }

    prompt += `

Génère le JSON :
{
  "projectName": "Hôtels Luxe Tunisie",
  "industry": "Tourism & Hotels",
  "keywords": ["hotel", "resort", "spa", "luxury", "thalasso", "5 étoiles", "فندق", "منتجع"],
  "searchQueries": [
    "four seasons hotel tunis instagram",
    "movenpick hotel lac tunis instagram",
    "sheraton tunis hotel facebook",
    "hilton skanes monastir instagram",
    "el mouradi hotels tunisie instagram",
    "فندق تونس انستقرام"
  ],
  "industryTerms": ["hotel", "resort", "palace", "spa", "thalasso", "suites", "فندق"],
  "targetAudience": ["Touristes étrangers", "Voyageurs d'affaires", "Familles tunisiennes", "Couples"],
  "languages": ["fr", "ar", "en"]
}

RAPPEL : Chaque searchQuery DOIT contenir le nom d'un hôtel précis de la liste + instagram ou facebook.
Retourne UNIQUEMENT le JSON.`;

    return prompt;
  }

  // ═══════════════════════════════════════════════════════
  // PARSE + VALIDATE
  // ═══════════════════════════════════════════════════════

  _parseJSON(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return {
        name           : (parsed.projectName || parsed.name || '').trim(),
        industry       : 'Tourism & Hotels',
        country        : 'Tunisie',
        marketCategory : '',
        keywords       : (parsed.keywords || []).map(k => k.trim().toLowerCase()),
        searchQueries  : parsed.searchQueries || [],
        industryTerms  : (parsed.industryTerms || []).map(t => t.trim().toLowerCase()),
        targetAudience : parsed.targetAudience || [],
        languages      : parsed.languages || ['fr', 'ar', 'en'],
        competitorsHint: [],
      };
    } catch (error) {
      throw new Error(`Parse JSON échoué: ${error.message}`);
    }
  }

  _validate(data) {
    const errors = [];
    if (!data.name || data.name.length < 2)                               errors.push('name manquant');
    if (!Array.isArray(data.keywords)       || data.keywords.length < 4)  errors.push('keywords insuffisants');
    if (!Array.isArray(data.searchQueries)  || data.searchQueries.length < 4) errors.push('searchQueries insuffisants');
    if (!Array.isArray(data.targetAudience) || data.targetAudience.length < 1) errors.push('targetAudience manquant');
    if (!Array.isArray(data.languages)      || data.languages.length < 1) errors.push('languages manquant');
    if (errors.length > 0) throw new Error(`Validation échouée: ${errors.join(', ')}`);
  }
}

module.exports = new ExtractionService();