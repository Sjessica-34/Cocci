const appEnvironment = (
  process.env.APP_ENV ??
  process.env.NODE_ENV ??
  "development"
).trim().toLowerCase();

export const isProduction =
  appEnvironment === "production" ||
  appEnvironment === "preprod" ||
  appEnvironment === "staging";
