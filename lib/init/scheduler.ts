// Initialize the license scheduler
import { licenseScheduler } from "@/lib/utils/license-scheduler";

// Auto-start scheduler in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_LICENSE_SCHEDULER === 'true') {
  // Start scheduler after a short delay to ensure database connection is ready
  setTimeout(() => {
    licenseScheduler.start();
  }, 5000);
}

export { licenseScheduler };