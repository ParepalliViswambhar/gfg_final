const { GoogleGenerativeAI } = require('@google/generative-ai');

class EnhancedAITextDetector {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: { temperature: 0 }
    });
  }

  async detect(text) {
    try {
      // Calculate multiple signals
      const signals = {
        burstiness: this.calculateBurstiness(text),
        patterns: this.detectAIPatterns(text).length,
        lexicalDiversity: this.calculateLexicalDiversity(text),
        sentenceComplexity: this.analyzeSentenceComplexity(text),
        transitionWords: this.countTransitionWords(text),
        perplexity: this.calculatePerplexity(text)
      };

      // Use LLM for advanced detection
      const llmAnalysis = await this.llmDetection(text);
      signals.llmScore = llmAnalysis.score;

      // Combine signals
      const aiProbability = this.combineSignals(signals);

      const indicators = this.generateIndicators(signals, llmAnalysis.indicators);

      return {
        isAIGenerated: aiProbability > 0.65,
        confidence: Math.round(aiProbability * 100),
        verdict: this.getVerdict(aiProbability),
        indicators: indicators.slice(0, 5),
        breakdown: {
          burstiness: Math.round((1 - Math.min(1, signals.burstiness)) * 100),
          patterns: Math.round((signals.patterns / 5) * 100),
          lexicalDiversity: Math.round((1 - signals.lexicalDiversity) * 100),
          sentenceComplexity: Math.round(signals.sentenceComplexity * 100),
          transitionWords: Math.round(signals.transitionWords * 100),
          perplexity: Math.round(signals.perplexity * 100),
          llmAnalysis: Math.round(signals.llmScore * 100)
        }
      };
    } catch (error) {
      console.error('AI detection failed:', error);
      return {
        isAIGenerated: false,
        confidence: 45,
        verdict: 'Likely Human',
        indicators: ['Detection analysis unavailable'],
        breakdown: {}
      };
    }
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
      'including but not limited to',
      'it should be noted',
      'one must consider',
      'it is essential to',
      'it is crucial to'
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

  analyzeSentenceComplexity(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 3) return 0.5;

    const complexities = sentences.map(s => {
      const words = s.trim().split(/\s+/);
      const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
      const commas = (s.match(/,/g) || []).length;
      const clauses = commas + 1;
      return avgWordLength + (clauses * 2);
    });

    const mean = complexities.reduce((a, b) => a + b, 0) / complexities.length;
    const variance = complexities.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / complexities.length;
    const stdDev = Math.sqrt(variance);
    
    // Low variance = AI (consistent complexity)
    // Normalize to 0-1 where 1 = likely AI
    return stdDev < 5 ? 0.8 : Math.max(0, Math.min(1, 1 - (stdDev / 20)));
  }

  countTransitionWords(text) {
    const transitions = [
      'however', 'moreover', 'furthermore', 'additionally', 'consequently',
      'therefore', 'thus', 'hence', 'nevertheless', 'nonetheless',
      'meanwhile', 'subsequently', 'accordingly', 'likewise', 'similarly'
    ];
    
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).length;
    const count = transitions.filter(t => lowerText.includes(t)).length;
    
    // AI uses more transition words relative to text length
    const ratio = count / (words / 100); // Transitions per 100 words
    return Math.min(1, ratio / 3); // Normalize (3+ transitions per 100 words = likely AI)
  }

  calculatePerplexity(text) {
    // Simplified perplexity using word frequency distribution
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (words.length < 10) return 0.5;

    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    
    const probabilities = words.map(w => freq[w] / words.length);
    const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0);
    
    // Lower entropy = more predictable = AI
    // Normalize to 0-1 where 1 = likely AI
    const normalizedEntropy = entropy / 10; // Typical entropy is 0-10
    return Math.max(0, Math.min(1, 1 - normalizedEntropy));
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
6. Natural imperfections (humans make more typos, grammar errors)
7. Unique voice and personality (humans have more)

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
      console.error('LLM detection failed:', error);
      return { score: 0.5, indicators: [] };
    }
  }

  combineSignals(signals) {
    // Weighted combination of signals
    const weights = {
      burstiness: 0.15,
      patterns: 0.15,
      lexicalDiversity: 0.15,
      sentenceComplexity: 0.10,
      transitionWords: 0.10,
      perplexity: 0.15,
      llmScore: 0.20
    };

    let score = 0;

    // Burstiness (invert - low burstiness means AI)
    score += (1 - Math.min(1, signals.burstiness)) * weights.burstiness;

    // Patterns (normalize to 0-1)
    score += Math.min(1, signals.patterns / 5) * weights.patterns;

    // Lexical diversity (invert - low diversity means AI)
    score += (1 - signals.lexicalDiversity) * weights.lexicalDiversity;

    // Sentence complexity (high uniformity = AI)
    score += signals.sentenceComplexity * weights.sentenceComplexity;

    // Transition words (high usage = AI)
    score += signals.transitionWords * weights.transitionWords;

    // Perplexity (low = AI)
    score += signals.perplexity * weights.perplexity;

    // LLM score
    score += signals.llmScore * weights.llmScore;

    return Math.max(0, Math.min(1, score));
  }

  generateIndicators(signals, llmIndicators) {
    const indicators = [];
    
    if (signals.burstiness < 0.3) {
      indicators.push("Consistent sentence lengths typical of AI");
    }
    if (signals.perplexity > 0.6) {
      indicators.push("Low perplexity - predictable word choices");
    }
    if (signals.patterns > 2) {
      indicators.push(`${signals.patterns} AI-typical phrases detected`);
    }
    if (signals.lexicalDiversity < 0.4) {
      indicators.push("Low lexical diversity - repetitive vocabulary");
    }
    if (signals.sentenceComplexity > 0.6) {
      indicators.push("Uniform sentence complexity across text");
    }
    if (signals.transitionWords > 0.5) {
      indicators.push("High usage of formal transition words");
    }

    // Add LLM indicators
    if (Array.isArray(llmIndicators)) {
      indicators.push(...llmIndicators);
    }

    return indicators;
  }

  getVerdict(probability) {
    if (probability >= 0.85) return 'AI Generated';
    if (probability >= 0.55) return 'Likely AI';
    if (probability >= 0.25) return 'Likely Human';
    return 'Human Written';
  }
}

module.exports = EnhancedAITextDetector;
