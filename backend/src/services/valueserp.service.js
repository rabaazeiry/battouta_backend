// backend/src/services/valueserp.service.js
// ⭐ NOUVEAU FICHIER À CRÉER

const axios = require('axios');

class ValueSerpService {
  constructor() {
    this.apiKey = process.env.VALUESERP_API_KEY;
    this.baseUrl = 'https://api.valueserp.com/search';
  }

  async searchGoogle(keywords, country = 'TN', maxResults = 20) {
    try {
      console.log('🔍 Recherche via ValueSERP (100/mois gratuit)...');

      if (!this.apiKey) {
        throw new Error('❌ VALUESERP_API_KEY manquant dans .env');
      }

      const query = keywords.join(' ');
      console.log(`🔎 Recherche ValueSERP: "${query}"`);

      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          q: query,
          location: country === 'TN' ? 'Tunisia' : country,
          google_domain: 'google.tn',
          gl: country.toLowerCase(),
          hl: 'fr',
          num: maxResults,
          output: 'json'
        },
        timeout: 30000
      });

      console.log('📦 Réponse ValueSERP reçue');

      if (!response.data.organic_results || response.data.organic_results.length === 0) {
        console.warn('⚠️ Aucun résultat organique trouvé');
        return [];
      }

      const formatted = response.data.organic_results.map(item => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
        domain: this._extractDomain(item.link)
      }));

      console.log(`✅ ${formatted.length} résultats ValueSERP reçus`);
      return formatted;

    } catch (error) {
      console.error('❌ Erreur ValueSERP:', error.message);
      
      if (error.response) {
        console.error('Détails erreur:', error.response.data);
      }
      
      throw error;
    }
  }

  _extractDomain(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
}

module.exports = new ValueSerpService();