module.exports = {
  apps: [
    {
      name: 'echo-core',
      script: 'pnpm',
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_BASE_URL: 'https://example.com',
        TELEGRAM_BOT_USERNAME: 'your_bot_username',
        TELEGRAM_BOT_TOKEN: 'replace_with_bot_token',
        TG_WEBHOOK_SECRET: 'replace_with_webhook_secret',
        BOT_ISSUE_SECRET: 'replace_with_internal_secret',
        NONCE_TTL_SEC: '600',
      },
    },
  ],
}
