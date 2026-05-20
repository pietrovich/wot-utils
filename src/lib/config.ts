export function getAppId(): string {
  const appId = process.env.WG_APP_ID;
  if (!appId) {
    console.error('Error: No application ID. Set WG_APP_ID in .env.');
    process.exit(1);
  }

  return appId;
}
