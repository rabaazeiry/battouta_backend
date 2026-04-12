// backend/src/services/rag.service.js
const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  title    : String,
  content  : String,
  domain   : String,
  url      : String,
  keywords : [String],
  createdAt: { type: Date, default: Date.now, expires: 604800 }
});

articleSchema.index({ projectId: 1, keywords: 1 });

const Article = mongoose.models.RagArticle ||
  mongoose.model('RagArticle', articleSchema);

class RagService {

  async storeArticles(articles, projectId) {
    if (!articles.length) return;
    try {
      const docs = articles.map(a => ({
        projectId: String(projectId),
        title    : a.title   || '',
        content  : a.snippet || '',
        domain   : a.domain  || '',
        url      : a.url     || '',
        keywords : this._extractKeywords(a.title + ' ' + a.snippet)
      }));
      await Article.insertMany(docs, { ordered: false });
      console.log(`📦 RAG MongoDB: ${docs.length} articles stockés pour projet ${projectId}`);
    } catch (err) {
      console.warn('⚠️  RAG store échoué:', err.message);
    }
  }

  async retrieveContext(companyName, projectId, nResults = 3) {
    try {
      const queryKeywords = this._extractKeywords(companyName);

      const articles = await Article.find({
        projectId: String(projectId),
        keywords : { $in: queryKeywords }
      })
      .sort({ createdAt: -1 })
      .limit(nResults)
      .lean();

      if (!articles.length) {
        const fallback = await Article.find({ projectId: String(projectId) })
          .sort({ createdAt: -1 })
          .limit(nResults)
          .lean();

        if (!fallback.length) {
          console.log(`   ⚠️  Pas d'articles RAG pour ${companyName}`);
          return '';
        }

        const context = fallback
          .map(a => `Title: ${a.title}\nContent: ${a.content}`)
          .join('\n---\n')
          .substring(0, 1000);

        console.log(`   📖 RAG fallback: ${fallback.length} articles pour "${companyName}"`);
        return context;
      }

      const context = articles
        .map(a => `Title: ${a.title}\nContent: ${a.content}`)
        .join('\n---\n')
        .substring(0, 1000);

      console.log(`   📖 RAG: ${articles.length} articles trouvés pour "${companyName}"`);
      return context;

    } catch (err) {
      console.warn(`   ⚠️  RAG retrieve échoué:`, err.message);
      return '';
    }
  }

  async clearProject(projectId) {
    try {
      await Article.deleteMany({ projectId: String(projectId) });
      console.log(`🗑️  RAG MongoDB: articles supprimés pour projet ${projectId}`);
    } catch (err) {
      console.warn('⚠️  RAG clear échoué:', err.message);
    }
  }

  _extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
      'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
      'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'shall', 'can',
      'de', 'du', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'au',
      'que', 'qui', 'dans', 'sur', 'par', 'pour', 'avec', 'est', 'sont'
    ]);
    return text
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 20);
  }
}

module.exports = new RagService();