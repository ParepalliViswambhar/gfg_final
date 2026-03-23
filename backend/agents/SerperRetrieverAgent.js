const axios = require('axios');

class SerperRetrieverAgent {
  constructor(serperApiKey) {
    this.serperApiKey = serperApiKey;
    this.baseUrl = 'https://google.serper.dev/search';
  }

  async retrieve(claim) {
    if (!this.serperApiKey) {
      console.warn('Serper API key not configured');
      return [];
    }

    try {
      const results = await this.searchWithRetry(claim.text, claim.isTemporal);
      const rankedResults = this.rankByAuthority(results, claim.isTemporal);
      return rankedResults.slice(0, 3);
    } catch (error) {
      console.error('Evidence retrieval failed:', error);
      return [];
    }
  }

  async searchWithRetry(query, isTemporal, retries = 2) {
    try {
      const searchOptions = {
        q: query,
        num: 5,
        gl: 'us',
        hl: 'en'
      };

      // For temporal claims, prioritize recent results
      if (isTemporal) {
        searchOptions.tbs = 'qdr:m3'; // Last 3 months
      }

      const response = await axios.post(this.baseUrl, searchOptions, {
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const results = response.data?.organic || [];
      
      return results.map(r => ({
        title: r.title || 'Untitled',
        url: r.link || '',
        snippet: r.snippet || '',
        domain: this.extractDomain(r.link),
        publishedDate: r.date || null
      }));
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        await this.delay(1000);
        return this.searchWithRetry(query, isTemporal, retries - 1);
      }
      console.error('Search failed:', error.message);
      return [];
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  rankByAuthority(results, isTemporal) {
    const authorityScores = {
      '.gov': 100,
      '.edu': 90,
      'wikipedia.org': 85,
      'britannica.com': 85,
      '.org': 70,
      'reuters.com': 80,
      'apnews.com': 80,
      'bbc.com': 75,
      'bbc.co.uk': 75,
      'cnn.com': 70,
      'nytimes.com': 75,
      'theguardian.com': 75,
      'washingtonpost.com': 75,
      'nature.com': 90,
      'science.org': 90,
      'nih.gov': 95,
      'who.int': 90
    };

    const penaltyDomains = ['blog', 'forum', 'reddit', 'quora', 'yahoo'];

    return results
      .map(result => {
        let score = 50; // Base score

        // Authority bonus
        const domain = result.domain.toLowerCase();
        for (const [key, value] of Object.entries(authorityScores)) {
          if (domain.includes(key)) {
            score += value;
            break;
          }
        }

        // Penalty for low-quality domains
        for (const penalty of penaltyDomains) {
          if (domain.includes(penalty)) {
            score -= 30;
            break;
          }
        }

        // Recency bonus for temporal claims
        if (isTemporal && result.publishedDate) {
          try {
            const publishDate = new Date(result.publishedDate);
            const daysSincePublish = (Date.now() - publishDate) / (1000 * 60 * 60 * 24);
            
            if (daysSincePublish < 30) score += 20;
            else if (daysSincePublish < 90) score += 10;
            else if (daysSincePublish > 365) score -= 20;
          } catch (e) {
            // Invalid date, skip recency bonus
          }
        }

        return {
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          domain: result.domain,
          publishedDate: result.publishedDate,
          score: score
        };
      })
      .sort((a, b) => b.score - a.score)
      .filter(result => result.score > 20); // Filter out very low quality
  }

  isRetryable(error) {
    return error.response?.status === 429 || 
           error.response?.status === 503 ||
           error.code === 'ECONNABORTED';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SerperRetrieverAgent;
