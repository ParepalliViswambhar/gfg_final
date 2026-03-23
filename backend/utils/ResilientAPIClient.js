class ResilientAPIClient {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
  }

  async callWithRetry(fn, retries = this.maxRetries) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        )
      ]);
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        const delay = this.retryDelay * Math.pow(this.backoffMultiplier, this.maxRetries - retries);
        console.log(`Retrying after ${delay}ms... (${retries} retries left)`);
        await this.delay(delay);
        return this.callWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  isRetryable(error) {
    if (!error) return false;

    const retryableMessages = [
      'rate limit',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'network error'
    ];

    const retryableStatuses = [429, 500, 502, 503, 504];

    const messageRetryable = retryableMessages.some(msg =>
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );

    const statusRetryable = retryableStatuses.includes(error.status || error.statusCode);

    return messageRetryable || statusRetryable;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ResilientAPIClient;
