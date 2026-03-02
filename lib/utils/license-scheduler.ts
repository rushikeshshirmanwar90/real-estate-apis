import { logger } from "./logger";

class LicenseScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the daily license update scheduler
  start() {
    if (this.isRunning) {
      logger.warn("License scheduler is already running");
      return;
    }

    // Run every 24 hours (86400000 milliseconds)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    // Run immediately on start (optional)
    this.runLicenseUpdate();
    
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

  // Manual trigger for license update
  async runLicenseUpdate() {
    try {
      logger.info("Starting scheduled license update...");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/api/cron/license-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        logger.info("License update completed successfully:", result);
      } else {
        logger.error("License update failed:", response.statusText);
      }
    } catch (error) {
      logger.error("Error running scheduled license update:", error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null
    };
  }
}

// Export singleton instance
export const licenseScheduler = new LicenseScheduler();

// Auto-start in production (you can modify this logic as needed)
if (process.env.NODE_ENV === 'production') {
  licenseScheduler.start();
}