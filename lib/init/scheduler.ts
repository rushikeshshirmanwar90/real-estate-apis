// Initialize the license scheduler
import { licenseScheduler } from "@/lib/utils/license-scheduler";
import { logger } from "@/lib/utils/logger";

// Auto-start scheduler always (in all environments)
setTimeout(() => {
  logger.info("Initializing license scheduler (always enabled)...");
  licenseScheduler.start();
}, 5000);

export { licenseScheduler };