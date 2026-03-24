const { GoogleGenerativeAI } = require('@google/generative-ai');

class ClaimExtractorAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: { temperature: 0 }
    });
  }

  async extract(text) {
    const safeText = String(text || '').trim();

    // Fast-path for conversational input so the UI does not appear stuck on claim extraction.
    if (this.isLikelyNonFactual(safeText)) {
      return [];
    }

    // Limit text length to reduce processing time
    const truncatedText = safeText.substring(0, 2000);
    
    const extractionPrompt = `Extract up to 5 key verifiable claims from this text. Focus on the most important facts.

RULES:
1. Each claim = one independently verifiable fact
2. Ignore opinions and questions
3. Keep claims concise
4. Maximum 5 claims

Text: "${truncatedText}"

Return ONLY JSON array:
[{"id": 1, "claim": "...", "context": "...", "isTemporal": false}]`;

    try {
      const result = await this.withTimeout(
        this.model.generateContent(extractionPrompt),
        18000,
        'Claim extraction timed out'
      );
      let responseText = result.response.text().trim();
      
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) responseText = jsonMatch[1];
      responseText = responseText.replace(/^```|```$/g, '').trim();

      const claims = JSON.parse(responseText);
      
      // Validate and deduplicate, limit to 5 claims
      return this.validateAndDeduplicate(claims).slice(0, 5);
    } catch (error) {
      console.error('Claim extraction failed:', error);
      
      // Check if content was blocked by safety filters
      if (error.message && error.message.includes('PROHIBITED_CONTENT')) {
        throw new Error('Content was flagged by safety filters. Please try different content.');
      }
      
      if (error.response?.promptFeedback?.blockReason === 'PROHIBITED_CONTENT') {
        throw new Error('Content was flagged by safety filters. Please try different content.');
      }
      
      // Fail open: return no claims rather than hanging the UX for non-critical extraction failures.
      return [];
    }
  }

  withTimeout(promise, timeoutMs, message) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  isLikelyNonFactual(text) {
    if (!text || text.length < 15) return true;

    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const casualPatterns = [
      /^(hi|hello|hey|yo|hii|hlo)[!,. ]*$/,
      /how are you/,
      /what'?s up/,
      /good (morning|afternoon|evening|night)/,
      /^thank(s| you)?[!,. ]*$/
    ];

    if (casualPatterns.some((pattern) => pattern.test(normalized))) {
      return true;
    }

    const sentences = normalized.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) return true;

    const factualSignals = /(\d|%|\$|\b(million|billion|according to|reported|study|research|published|in \d{4}|is|are|was|were|has|have)\b)/i;
    const hasFactualSignal = sentences.some((sentence) => factualSignals.test(sentence));

    return !hasFactualSignal;
  }

  validateAndDeduplicate(claims) {
    if (!Array.isArray(claims)) return [];

    const seen = new Set();
    const validated = [];

    for (const claim of claims) {
      if (!claim.claim || typeof claim.claim !== 'string') continue;
      
      const normalized = claim.claim.toLowerCase().trim();
      if (seen.has(normalized)) continue;
      
      seen.add(normalized);
      validated.push({
        id: validated.length + 1,
        text: claim.claim,
        context: claim.context || claim.claim,
        isTemporal: claim.isTemporal || this.detectTemporal(claim.claim),
        evidence: [],
        verdict: null,
        confidence: 0,
        reasoning: ''
      });
    }

    return validated;
  }

  detectTemporal(text) {
    const temporalKeywords = [
      'current', 'currently', 'now', 'today', 'latest', 'recent',
      'as of', 'this year', 'in 2024', 'in 2025', 'in 2026',
      'present', 'ongoing', 'at the moment'
    ];
    
    const lowerText = text.toLowerCase();
    return temporalKeywords.some(keyword => lowerText.includes(keyword));
  }
}

module.exports = ClaimExtractorAgent;
