export function getAppId(override?: string): string {
  const appId = override ?? process.env.WG_APP_ID;
  if (!appId) {
    console.error('Error: No application ID. Set WG_APP_ID in .env or pass --app-id.');
    process.exit(1);
  }

  return appId;
}
