const { GoogleGenerativeAI } = require('@google/generative-ai');

class VerificationAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: { temperature: 0 }
    });
  }

  async verify(claim, evidence) {
    if (!evidence || evidence.length === 0) {
      return {
        verdict: 'PARTIAL',
        confidence: 30,
        reasoning: 'Insufficient evidence found to fully verify or refute this claim. More research may be needed.',
        citedSources: []
      };
    }

    // Skip conflict detection to reduce API calls
    // Just verify directly with all evidence
    return await this.verifyWithChainOfThought(claim, evidence);
  }

  async verifyWithChainOfThought(claim, evidence) {
    // Simplified prompt to reduce token usage
    const evidenceText = evidence.slice(0, 3).map((e, i) => 
      `[${i}] ${e.title}\n   "${e.snippet.substring(0, 200)}..."`
    ).join('\n\n');

    const verificationPrompt = `Verify this claim using ONLY the evidence below. Do NOT use your training data.

CLAIM: "${claim.text}"

EVIDENCE:
${evidenceText}

Analyze step-by-step:
1. Does evidence support the claim?
2. What's the verdict?

VERDICT RULES:
- TRUE: Evidence strongly supports the claim
- FALSE: Evidence clearly contradicts the claim
- PARTIAL: Evidence partially supports or claim is partially accurate

Return ONLY JSON:
{
  "verdict": "TRUE|FALSE|PARTIAL",
  "confidence": 0-100,
  "reasoning": "Brief analysis with citations",
  "citedSources": [0, 1, 2]
}`;

    try {
      const result = await this.model.generateContent(verificationPrompt);
      let responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) responseText = jsonMatch[1];
      responseText = responseText.replace(/^```|```$/g, '').trim();

      const verification = JSON.parse(responseText);

      // Validate response
      if (!['TRUE', 'FALSE', 'PARTIAL'].includes(verification.verdict)) {
        verification.verdict = 'PARTIAL';
        verification.confidence = 40;
        verification.reasoning = verification.reasoning || 'Unable to determine clear verdict from available evidence.';
      }

      verification.confidence = Math.max(0, Math.min(100, verification.confidence || 50));

      return verification;
    } catch (error) {
      console.error('Verification failed:', error);
      return {
        verdict: 'PARTIAL',
        confidence: 30,
        reasoning: 'Unable to complete verification due to technical issues. The claim requires further investigation.',
        citedSources: []
      };
    }
  }

  async detectConflicts(claim, evidence) {
    if (evidence.length < 2) return false;

    const conflictPrompt = `Analyze if these sources conflict about the claim: "${claim.text}"

SOURCES:
${evidence.slice(0, 3).map((e, i) => `[${i}] ${e.title}: "${e.snippet}"`).join('\n')}

Do these sources significantly disagree? Return ONLY JSON:
{"hasConflict": true/false, "reason": "brief explanation"}`;

    try {
      const result = await this.model.generateContent(conflictPrompt);
      let responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) responseText = jsonMatch[1];
      responseText = responseText.replace(/^```|```$/g, '').trim();

      const analysis = JSON.parse(responseText);
      return analysis.hasConflict === true;
    } catch (error) {
      return false;
    }
  }

  async resolveConflict(claim, evidence) {
    const resolutionPrompt = `These sources conflict about: "${claim.text}"

CONFLICTING SOURCES:
${evidence.slice(0, 3).map((e, i) => 
  `[${i}] ${e.title} (${e.domain}, Authority Score: ${e.score || 50})\n   "${e.snippet}"`
).join('\n\n')}

Resolve this conflict by considering:
1. Source authority (.gov > .edu > major news > blogs)
2. Publication date (newer usually better for facts)
3. Specificity and detail of claims
4. Consensus among sources

Return ONLY valid JSON:
{
  "verdict": "TRUE|FALSE|PARTIAL",
  "confidence": 0-100,
  "reasoning": "Explain which sources are more reliable and why",
  "citedSources": [preferred source indices]
}`;

    try {
      const result = await this.model.generateContent(resolutionPrompt);
      let responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) responseText = jsonMatch[1];
      responseText = responseText.replace(/^```|```$/g, '').trim();

      const resolution = JSON.parse(responseText);
      
      if (!['TRUE', 'FALSE', 'PARTIAL'].includes(resolution.verdict)) {
        resolution.verdict = 'PARTIAL';
        resolution.confidence = 40;
      }

      resolution.confidence = Math.max(0, Math.min(100, resolution.confidence || 50));

      return resolution;
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return {
        verdict: 'PARTIAL',
        confidence: 40,
        reasoning: 'Sources conflict and resolution was inconclusive.',
        citedSources: []
      };
    }
  }
}

module.exports = VerificationAgent;
