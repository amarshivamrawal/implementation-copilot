/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    ROCKETLANE_API_KEY: process.env.ROCKETLANE_API_KEY,
    ROCKETLANE_BASE_URL: process.env.ROCKETLANE_BASE_URL || 'https://api.rocketlane.com/api/1.0',
    ONEDRIVE_CLIENT_ID: process.env.ONEDRIVE_CLIENT_ID,
    ONEDRIVE_CLIENT_SECRET: process.env.ONEDRIVE_CLIENT_SECRET,
    ONEDRIVE_TENANT_ID: process.env.ONEDRIVE_TENANT_ID,
    ZENOTI_TEAM_DOMAINS: process.env.ZENOTI_TEAM_DOMAINS || 'zenoti.com',
    RESPONSE_DELAY_THRESHOLD_DAYS: process.env.RESPONSE_DELAY_THRESHOLD_DAYS || '2',
  },
};

module.exports = nextConfig;
