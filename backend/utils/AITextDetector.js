const { GoogleGenerativeAI } = require('@google/generative-ai');

class AITextDetector {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: { temperature: 0 }
    });
  }

  async detect(text) {
    try {
      const wordCount = this.getWordCount(text);
      if (this.isLowInformationText(text, wordCount)) {
        return {
          isAIGenerated: null,
          confidence: null,
          verdict: 'Insufficient Content',
          indicators: ['Text is too short or lacks meaningful language patterns for reliable AI detection.'],
          isInsufficient: true,
          wordCount
        };
      }

      // Calculate multiple signals
      const burstiness = this.calculateBurstiness(text);
      const patterns = this.detectAIPatterns(text);
      const lexicalDiversity = this.calculateLexicalDiversity(text);

      // Use LLM for advanced detection
      const llmAnalysis = await this.llmDetection(text);

      // Combine signals
      const aiProbability = this.combineSignals({
        burstiness,
        patterns: patterns.length,
        lexicalDiversity,
        llmScore: llmAnalysis.score
      });

      const indicators = [
        burstiness < 0.3 && "Low burstiness - consistent sentence lengths typical of AI",
        patterns.length > 0 && `AI patterns detected: ${patterns.slice(0, 3).join(', ')}`,
        lexicalDiversity < 0.4 && "Low lexical diversity - repetitive word choice",
        llmAnalysis.indicators
      ].filter(Boolean).flat();

      return {
        isAIGenerated: aiProbability > 0.65,
        confidence: Math.round(aiProbability * 100),
        verdict: this.getVerdict(aiProbability),
        indicators: indicators.slice(0, 5),
        isInsufficient: false,
        wordCount
      };
    } catch (error) {
      console.error('AI detection failed:', error);
      return {
        isAIGenerated: false,
        confidence: 45,
        verdict: 'Likely Human',
        indicators: ['Detection analysis unavailable'],
        isInsufficient: false,
        wordCount: this.getWordCount(text)
      };
    }
  }

  getWordCount(text) {
    return String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;
  }

  isLowInformationText(text, wordCount) {
    if (wordCount < 3) return true;

    const cleaned = String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const uniqueWords = new Set(tokens).size;
    const repetitiveWords = uniqueWords <= 1 && tokens.length <= 8;
    const looksLikeCharacterSpam = tokens.every((token) => /^([a-z])\1{3,}$/.test(token));

    return repetitiveWords || looksLikeCharacterSpam;
  }

  calculateBurstiness(text) {
    // Measure variation in sentence length
    // AI tends to have consistent sentence lengths
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 3) return 0.5;

    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation
    return mean > 0 ? stdDev / mean : 0.5;
  }

  detectAIPatterns(text) {
    const aiPhrases = [
      'as an ai language model',
      'as an ai',
      'i don\'t have personal opinions',
      'i don\'t have personal experiences',
      'it\'s important to note',
      'it is important to note',
      'in conclusion',
      'to summarize',
      'furthermore',
      'moreover',
      'additionally',
      'it is worth noting',
      'it\'s worth noting',
      'however, it is important',
      'that being said',
      'on the other hand',
      'in other words',
      'for instance',
      'for example',
      'such as',
      'including but not limited to'
    ];

    const lowerText = text.toLowerCase();
    return aiPhrases.filter(phrase => lowerText.includes(phrase));
  }

  calculateLexicalDiversity(text) {
    // Type-Token Ratio (TTR)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (words.length < 10) return 0.5;

    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  async llmDetection(text) {
    const detectionPrompt = `Analyze if this text was written by AI or a human.

TEXT: "${text.substring(0, 2000)}"

Consider:
1. Writing style consistency (AI is very consistent)
2. Emotional depth and personal anecdotes (humans have more)
3. Unexpected transitions or tangents (humans have more)
4. Formulaic structure (AI tends to be more structured)
5. Use of clichés and common phrases (AI uses more)

Return ONLY valid JSON:
{
  "score": 0.0-1.0,
  "indicators": ["reason1", "reason2", "reason3"]
}

Where score: 0.0 = definitely human, 1.0 = definitely AI`;

    try {
      const result = await this.model.generateContent(detectionPrompt);
      let responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) responseText = jsonMatch[1];
      responseText = responseText.replace(/^```|```$/g, '').trim();

      const analysis = JSON.parse(responseText);
      return {
        score: Math.max(0, Math.min(1, analysis.score || 0.5)),
        indicators: Array.isArray(analysis.indicators) ? analysis.indicators : []
      };
    } catch (error) {
      return { score: 0.5, indicators: [] };
    }
  }

  combineSignals(signals) {
    // Weighted combination of signals
    const weights = {
      burstiness: 0.2,      // Low burstiness = more likely AI
      patterns: 0.3,        // More patterns = more likely AI
      lexicalDiversity: 0.2, // Low diversity = more likely AI
      llmScore: 0.3         // LLM analysis
    };

    let score = 0;

    // Burstiness (invert - low burstiness means AI)
    score += (1 - Math.min(1, signals.burstiness)) * weights.burstiness;

    // Patterns (normalize to 0-1)
    score += Math.min(1, signals.patterns / 5) * weights.patterns;

    // Lexical diversity (invert - low diversity means AI)
    score += (1 - signals.lexicalDiversity) * weights.lexicalDiversity;

    // LLM score
    score += signals.llmScore * weights.llmScore;

    return Math.max(0, Math.min(1, score));
  }

  getVerdict(probability) {
    if (probability >= 0.85) return 'AI Generated';
    if (probability >= 0.55) return 'Likely AI';
    if (probability >= 0.25) return 'Likely Human';
    return 'Human Written';
  }
}

module.exports = AITextDetector;
