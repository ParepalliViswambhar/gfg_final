const ClaimExtractorAgent = require('./ClaimExtractorAgent');
const SerperRetrieverAgent = require('./SerperRetrieverAgent');
const VerificationAgent = require('./VerificationAgent');

class OrchestratorAgent {
  constructor(geminiApiKey, serperApiKey) {
    this.extractorAgent = new ClaimExtractorAgent(geminiApiKey);
    this.retrieverAgent = new SerperRetrieverAgent(serperApiKey);
    this.verificationAgent = new VerificationAgent(geminiApiKey);
  }

  async analyze(text, progressCallback) {
    try {
      // Step 1: Extract claims
      if (progressCallback) {
        progressCallback({ stage: 'extracting', progress: 0, message: 'Extracting verifiable claims...' });
      }

      const claims = await this.extractorAgent.extract(text);

      if (progressCallback) {
        progressCallback({ 
          stage: 'extracting', 
          progress: 100, 
          message: `Found ${claims.length} verifiable claims`,
          claimsFound: claims.length 
        });
      }

      if (claims.length === 0) {
        const report = this.generateReport([], text);
        if (progressCallback) {
          progressCallback({ 
            stage: 'complete', 
            progress: 100,
            message: 'Analysis complete: No verifiable claims found.',
            result: report 
          });
        }
        return report;
      }

      // Limit to 5 claims to avoid rate limiting
      const limitedClaims = claims.slice(0, 5);

      // Step 2 & 3: Retrieve evidence and verify each claim
      for (let i = 0; i < limitedClaims.length; i++) {
        const claim = limitedClaims[i];
        const progress = ((i + 1) / limitedClaims.length) * 100;

        try {
          // Retrieve evidence
          if (progressCallback) {
            progressCallback({ 
              stage: 'searching', 
              progress: progress,
              currentClaim: claim.text,
              claimIndex: i + 1,
              totalClaims: limitedClaims.length,
              message: `Searching evidence for claim ${i + 1}/${limitedClaims.length}...`
            });
          }

          claim.evidence = await this.withTimeout(
            this.retrieverAgent.retrieve(claim),
            15000,
            'Evidence retrieval timed out'
          );

          // Add delay between claims to avoid rate limiting
          if (i < limitedClaims.length - 1) {
            await this.delay(1000); // 1 second delay between claims
          }

          // Verify claim
          if (progressCallback) {
            progressCallback({ 
              stage: 'verifying', 
              progress: progress,
              currentClaim: claim.text,
              claimIndex: i + 1,
              totalClaims: limitedClaims.length,
              message: `Verifying claim ${i + 1}/${limitedClaims.length}...`
            });
          }

          const verification = await this.withTimeout(
            this.verificationAgent.verify(claim, claim.evidence),
            20000,
            'Verification timed out'
          );
          
          claim.verdict = verification.verdict;
          claim.confidence = verification.confidence;
          claim.reasoning = verification.reasoning;
          claim.citedSources = verification.citedSources || [];

          // Add delay after verification
          if (i < limitedClaims.length - 1) {
            await this.delay(500); // 0.5 second delay
          }
        } catch (claimError) {
          console.error(`Error processing claim ${i + 1}:`, claimError);
          // Continue with next claim even if one fails
          claim.verdict = 'PARTIAL';
          claim.confidence = 30;
          claim.reasoning = 'Unable to process this claim due to technical issues.';
          claim.evidence = [];
        }
      }

      // Generate final report
      const report = this.generateReport(limitedClaims, text);

      if (progressCallback) {
        progressCallback({ 
          stage: 'complete', 
          progress: 100,
          message: 'Analysis complete!',
          result: report 
        });
      }

      return report;
    } catch (error) {
      console.error('Orchestration failed:', error);
      
      if (progressCallback) {
        progressCallback({ 
          stage: 'error', 
          message: error.message || 'Analysis failed. Please try again.',
          error: error.message
        });
      }

      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  generateReport(claims, originalText) {
    const stats = {
      true: 0,
      false: 0,
      partial: 0,
      unverifiable: 0
    };

    claims.forEach(claim => {
      const verdict = claim.verdict?.toLowerCase();
      if (verdict === 'true') stats.true++;
      else if (verdict === 'false') stats.false++;
      else if (verdict === 'partial') stats.partial++;
      else stats.unverifiable++; // Fallback for any unexpected values
    });

    // Calculate overall accuracy score
    const totalClaims = claims.length;
    let score = 0;

    if (totalClaims > 0) {
      const trueWeight = 100;
      const partialWeight = 50;
      const falseWeight = 0;
      const unverifiableWeight = 40; // Slightly higher weight since it's now used for insufficient evidence

      score = Math.round(
        (stats.true * trueWeight + 
         stats.partial * partialWeight + 
         stats.false * falseWeight + 
         stats.unverifiable * unverifiableWeight) / totalClaims
      );
    } else {
      score = 100; // No claims = nothing to verify
    }

    return {
      score: score,
      totalClaims: totalClaims,
      stats: stats,
      text: originalText,
      claims: claims.map(claim => ({
        id: claim.id,
        text: claim.text,
        context: claim.context,
        verdict: claim.verdict,
        confidence: claim.confidence,
        reasoning: claim.reasoning,
        evidence: claim.evidence,
        isTemporal: claim.isTemporal
      }))
    };
  }
}

module.exports = OrchestratorAgent;
