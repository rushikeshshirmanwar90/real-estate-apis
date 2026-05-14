import { logger } from "./logger";

class LicenseScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunTime: Date | null = null;

  // Start the daily license update scheduler
  start() {
    if (this.isRunning) {
      logger.warn("License scheduler is already running");
      return;
    }

    // Run every 24 hours (86400000 milliseconds)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    // Check if we should run immediately (if it's been more than 24 hours since last run)
    this.checkAndRunIfNeeded();
    
    // Schedule to run every 24 hours
    this.intervalId = setInterval(() => {
      this.runLicenseUpdate();
    }, TWENTY_FOUR_HOURS);
    
    this.isRunning = true;
    logger.info("License scheduler started - will run every 24 hours");
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("License scheduler stopped");
  }

  // Check if we need to run immediately (for first startup)
  private async checkAndRunIfNeeded() {
    try {
      // You could store last run time in database or file
      // For now, just run on startup
      logger.info("Running initial license update on scheduler startup");
      await this.runLicenseUpdate();
    } catch (error) {
      logger.error("Error in initial license update:", error);
    }
  }

  // Manual trigger for license update
  async runLicenseUpdate() {
    try {
      logger.info("Starting scheduled license update...");
      this.lastRunTime = new Date();
      
      // Determine the correct domain based on environment
      // In Docker: use container port 3000
      // In local dev: use localhost:8080
      // In production: use environment variable
      const isDocker = process.env.DOCKER_ENV === 'true' || process.env.REDIS_HOST === 'redis';
      const isProduction = process.env.NODE_ENV === 'production' && !isDocker;
      
      let domain: string;
      if (isDocker) {
        domain = 'http://localhost:3000'; // Docker internal
      } else if (isProduction) {
        domain = process.env.DOMAIN || 'https://xsite.tech';
      } else {
        domain = 'http://localhost:8080'; // Local development
      }
      
      logger.info(`License scheduler using domain: ${domain}`);
      
      const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
      
      const response = await fetch(`${domain}/api/cron/license-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret}`
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (response.ok) {
        const result = await response.json();
        logger.info("License update completed successfully:", result);
        return result;
      } else {
        const errorText = await response.text();
        logger.error(`License update failed: ${response.status}`, errorText);
        throw new Error(`License update failed: ${response.statusText}`);
      }
    } catch (error: any) {
      // Don't log as error if it's just a connection refused (server starting up)
      if (error.code === 'ECONNREFUSED' || error.name === 'AbortError') {
        logger.warn("License update skipped - server still starting up or timeout");
        return { skipped: true, reason: 'Server starting up or timeout' };
      }
      logger.error("Error running scheduled license update:", error);
      throw error;
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null,
      lastRunTime: this.lastRunTime
    };
  }
}

// Export singleton instance
export const licenseScheduler = new LicenseScheduler();

// Auto-start scheduler always (in all environments)
setTimeout(() => {
  logger.info("Auto-starting license scheduler (always enabled)...");
  licenseScheduler.start();
}, 10000); // 10 second delay to ensure everything is ready