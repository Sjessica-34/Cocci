import app from "./app";
import { logger } from "./lib/logger";
import { ensureAllOrganizationsAnnualLifecycle } from "./lib/exerciseLifecycle";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void ensureAllOrganizationsAnnualLifecycle().catch((error) => {
    logger.error({ err: error }, "Initial annual exercise maintenance failed");
  });
});

const annualMaintenanceInterval = setInterval(() => {
  void ensureAllOrganizationsAnnualLifecycle();
}, 6 * 60 * 60 * 1000);
annualMaintenanceInterval.unref();
