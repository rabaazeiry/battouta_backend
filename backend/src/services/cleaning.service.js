// backend/src/services/cleaning.service.js
// VERSION FINALE — fix foundedYear >= 1900

class CleaningService {

  cleanCompetitor(rawData) {
    return {
      companyName : this.cleanCompanyName(rawData.companyName, rawData.website),
      description : this.cleanDescription(rawData.description),
      website     : this.cleanUrl(rawData.website),
      logo        : this.cleanLogo(rawData.logo, rawData.website),
      socialMedia : this.cleanSocialMedia(rawData.socialMedia),
      foundedYear : this.cleanFoundedYear(rawData.notes || rawData.foundedYear),
      notes       : this.cleanNotes(rawData.notes)
    };
  }

  cleanDescription(description) {
    if (!description || typeof description !== 'string') return '';
    let clean = this._fixUtf8(description);
    clean = clean.replace(/<[^>]*>/g, ' ');
    clean = clean.replace(/https?:\/\/\S+/g, '');
    clean = clean.replace(/[^\w\s\u00C0-\u024F\u0600-\u06FF.,!?;:()\-'"]/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    if (clean.length < 20) return '';
    return clean.length > 500 ? clean.substring(0, 500).trim() + '...' : clean;
  }

  cleanCompanyName(name, website) {
    const genericNames = ['new','home','welcome','index','main','accueil','bienvenue','page','site'];
    if (!name || genericNames.includes(name.toLowerCase().trim()) || name.length < 3)
      return this._extractNameFromUrl(website);
    let clean = this._fixUtf8(name);
    clean = clean.replace(/\s*[-|–]\s*.+$/, '').replace(/\s*(Ltd|LLC|Inc|SAS|SARL|SA)\.?$/i, '').trim();
    return clean || this._extractNameFromUrl(website);
  }

  cleanUrl(url) {
    if (!url || url.includes('localhost')) return '';
    try { new URL(url); return url; } catch { return ''; }
  }

  cleanLogo(logo, baseWebsite) {
    if (!logo?.url) return { url: '', source: '' };
    const logoUrl = logo.url;
    if (logoUrl.includes('localhost') || logoUrl.startsWith('data:')) return { url: '', source: '' };
    if (!logoUrl.startsWith('http')) {
      try { return { url: new URL(logoUrl, baseWebsite).href, source: logo.source || '' }; }
      catch { return { url: '', source: '' }; }
    }
    return { url: logoUrl, source: logo.source || '' };
  }

  cleanSocialMedia(socialMedia) {
    const empty = { url: '', username: '', verified: false };
    if (!socialMedia) return { instagram: {...empty}, facebook: {...empty}, linkedin: {...empty}, tiktok: {...empty} };

    const FAKE_PATTERNS = ['sharer.php','shareArticle','share?','intent/tweet','javascript:','mailto:','logout','login','signup'];
    const EXPECTED = { instagram:'instagram.com', facebook:'facebook.com', linkedin:'linkedin.com', tiktok:'tiktok.com' };
    const cleaned = {};

    for (const platform of ['instagram','facebook','linkedin','tiktok']) {
      const url = socialMedia[platform]?.url || '';
      const isFake = FAKE_PATTERNS.some(p => url.toLowerCase().includes(p));
      if (isFake || !url || !url.includes(EXPECTED[platform])) {
        cleaned[platform] = {...empty};
      } else {
        cleaned[platform] = { url, username: this._extractUsername(url), verified: false };
      }
    }
    return cleaned;
  }

  cleanFoundedYear(notesOrYear) {
    if (!notesOrYear) return '';
    let year = notesOrYear;
    if (typeof notesOrYear === 'string' && notesOrYear.includes('Founded:'))
      year = notesOrYear.replace('Founded:', '').trim();
    const yearNum     = parseInt(year);
    const currentYear = new Date().getFullYear();
    // ✅ FIX — 1900 au lieu de 1990
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) return '';
    return String(yearNum);
  }

  cleanNotes(notes) {
    if (!notes) return '';
    const cleanedYear = this.cleanFoundedYear(notes);
    return cleanedYear ? `Founded: ${cleanedYear}` : '';
  }

  _fixUtf8(text) {
    if (!text) return '';
    if (!/Ã|â€/.test(text)) return text;
    try { return decodeURIComponent(escape(text)); }
    catch {
      return text
        .replace(/Ã©/g,'é').replace(/Ã¨/g,'è').replace(/Ã /g,'à')
        .replace(/Ã§/g,'ç').replace(/Ã®/g,'î').replace(/Ã´/g,'ô')
        .replace(/â€™/g,"'").replace(/â€œ/g,'"').replace(/â€"/g,'–');
    }
  }

  _extractNameFromUrl(website) {
    if (!website) return 'Unknown';
    try {
      const domain = new URL(website).hostname.replace('www.','').split('.')[0];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch { return 'Unknown'; }
  }

  _extractUsername(url) {
    if (!url) return '';
    try {
      const ignored = ['company','in','pub','pages','groups','channel','user','home','about','posts','profile.php','search','hashtag','explore'];
      const segments = new URL(url).pathname.split('/').filter(s => s.length > 0);
      return (segments.find(s => !ignored.includes(s.toLowerCase()) && s.length > 1) || '').replace(/^@/,'');
    } catch { return ''; }
  }

  cleanCompetitors(competitors) {
    return competitors.map(c => ({ ...c, ...this.cleanCompetitor(c) }));
  }

  generateCleaningReport(before, after) {
    const report = { total: before.length, descriptionFixed: 0, nameFixed: 0, logoFixed: 0, yearFixed: 0 };
    before.forEach((b, i) => {
      const a = after[i];
      if (b.description !== a.description) report.descriptionFixed++;
      if (b.companyName !== a.companyName)  report.nameFixed++;
      if (b.logo?.url   !== a.logo?.url)    report.logoFixed++;
      if (b.notes       !== a.notes)        report.yearFixed++;
    });
    console.log('🧹 Rapport nettoyage:');
    console.log(`   Description : ${report.descriptionFixed} corrigées`);
    console.log(`   Noms        : ${report.nameFixed} corrigés`);
    console.log(`   Logos       : ${report.logoFixed} corrigés`);
    console.log(`   Années      : ${report.yearFixed} corrigées`);
    return report;
  }
}

module.exports = new CleaningService();