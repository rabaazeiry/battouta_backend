// backend/src/services/chroma.service.js
// VERSION FINALE — ChromaDB Cloud + query précise avec domaine

const { ChromaClient }             = require('chromadb');
const { DefaultEmbeddingFunction } = require('@chroma-core/default-embed');

class ChromaService {

  constructor() {
    this.client         = null;
    this.collection     = null;
    this.available      = false;
    this.collectionName = 'competitors_context';
    this.embeddingFn    = new DefaultEmbeddingFunction();
  }

  async init() {
    if (this.collection) return;
    try {
      this.client = new ChromaClient({
        ssl     : true,
        host    : 'api.trychroma.com',
        port    : 443,
        headers : { 'x-chroma-token': process.env.CHROMA_API_KEY },
        tenant  : process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE
      });

      this.collection = await this.client.getOrCreateCollection({
        name             : this.collectionName,
        embeddingFunction: this.embeddingFn,
        metadata         : { description: 'Tavily articles RAG for competitor classification' }
      });

      this.available = true;
      console.log('✅ ChromaDB Cloud connecté — collection:', this.collectionName);

    } catch (err) {
      console.warn('⚠️  ChromaDB Cloud non disponible:', err.message);
      this.collection = null;
      this.available  = false;
    }
  }

  async storeArticles(articles, projectId) {
    await this.init();
    if (!this.available || !articles.length) return;

    try {
      const documents = articles.map(a =>
        `Title: ${a.title}\nContent: ${a.snippet}\nSource: ${a.domain}`
      );

      const ids = articles.map((_, i) =>
        `${String(projectId)}_${Date.now()}_${i}`
      );

      const metadatas = articles.map(a => ({
        projectId: String(projectId),
        url      : a.url    || '',
        domain   : a.domain || '',
        title    : a.title  || ''
      }));

      await this.collection.add({ documents, ids, metadatas });
      console.log(`📦 ChromaDB Cloud: ${articles.length} articles stockés avec embeddings`);

    } catch (err) {
      console.warn('⚠️  ChromaDB store échoué:', err.message);
    }
  }

  // ✅ FIX — query plus précise avec domaine du concurrent
  async retrieveContext(companyName, projectId, website = '', nResults = 3) {
    await this.init();
    if (!this.available) return '';

    try {
      // Extraire le domaine depuis le website
      let domain = '';
      try {
        domain = new URL(website).hostname.replace('www.', '');
      } catch { domain = ''; }

      // Query enrichie avec nom + domaine + secteur
      const query = domain
        ? `${companyName} ${domain} company competitor`
        : `${companyName} company competitor market analysis`;

      const results = await this.collection.query({
        queryTexts: [query],
        nResults  : nResults,
        where     : { projectId: String(projectId) }
      });

      const docs = results.documents?.[0] || [];
      if (!docs.length) {
        console.log(`   ⚠️  Pas de contexte ChromaDB pour "${companyName}"`);
        return '';
      }

      // ✅ Filtrer les articles qui mentionnent le nom ou domaine
      const relevant = docs.filter(doc => {
        const d = doc.toLowerCase();
        const n = companyName.toLowerCase();
        const dm = domain.toLowerCase();
        return d.includes(n) || (dm && d.includes(dm.split('.')[0]));
      });

      // Si des articles pertinents trouvés → utiliser ceux-là
      // Sinon → utiliser tous les résultats (fallback)
      const finalDocs = relevant.length > 0 ? relevant : docs;

      const context = finalDocs.join('\n---\n').substring(0, 1000);
      console.log(`   📖 ChromaDB: ${finalDocs.length} articles pertinents pour "${companyName}" (similarité sémantique)`);
      return context;

    } catch (err) {
      console.warn(`   ⚠️  ChromaDB retrieve échoué:`, err.message);
      return '';
    }
  }

  async clearProject(projectId) {
    await this.init();
    if (!this.available) return;
    try {
      await this.collection.delete({
        where: { projectId: String(projectId) }
      });
      console.log(`🗑️  ChromaDB Cloud: articles supprimés pour projet ${projectId}`);
    } catch (err) {
      console.warn('⚠️  ChromaDB clear échoué:', err.message);
    }
  }
}

module.exports = new ChromaService();