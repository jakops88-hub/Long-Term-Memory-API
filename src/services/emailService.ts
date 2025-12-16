import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.resendApiKey);

interface WelcomeEmailParams {
  to: string;
  apiKey: string;
  tier: string;
}

export async function sendWelcomeEmail({ to, apiKey, tier }: WelcomeEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'MemVault <noreply@memvault.com>', // Update with your verified domain
      to: [to],
      subject: 'Welcome to MemVault - Your API Key',
      html: generateWelcomeEmailHTML({ email: to, apiKey, tier }),
    });

    if (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }

    console.log('✅ Welcome email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
}

function generateWelcomeEmailHTML({ email, apiKey, tier }: { email: string; apiKey: string; tier: string }) {
  const loginUrl = env.corsOrigin ? `${env.corsOrigin}/login` : 'https://memvault.com/login';
  const dashboardUrl = env.corsOrigin ? `${env.corsOrigin}/dashboard` : 'https://memvault.com/dashboard';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MemVault</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #f9fafb;
      border-radius: 8px;
      padding: 30px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #3b82f6;
    }
    .api-key-box {
      background: #1f2937;
      color: #fff;
      padding: 15px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      word-break: break-all;
      margin: 20px 0;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 5px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .code-example {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      margin: 15px 0;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🧠 MemVault</div>
      <h1>Welcome to MemVault!</h1>
      <p>Your Memory-as-a-Service API is ready to use</p>
    </div>

    <p>Hi there,</p>
    <p>Thank you for signing up for MemVault <strong>${tier}</strong> plan! Your account is now active and ready to use.</p>

    <h2>Your API Key</h2>
    <p>Here's your API key. Keep it secure and never share it publicly:</p>
    
    <div class="api-key-box">
      ${apiKey}
    </div>

    <div class="warning">
      <strong>⚠️ Important:</strong> This API key gives full access to your MemVault account. Store it securely in your environment variables and never commit it to version control.
    </div>

    <h2>Getting Started</h2>
    
    <p><strong>1. Login to your dashboard:</strong></p>
    <a href="${loginUrl}" class="button">Login to Dashboard</a>

    <p><strong>2. Make your first API call:</strong></p>
    <div class="code-example">
curl -X POST ${env.corsOrigin || 'https://api.memvault.com'}/api/memory/add \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "user-001",
    "text": "User prefers dark mode and sans-serif fonts",
    "metadata": {"category": "preferences"}
  }'
    </div>

    <p><strong>3. Retrieve memories:</strong></p>
    <div class="code-example">
curl -X POST ${env.corsOrigin || 'https://api.memvault.com'}/api/memory/search \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "user-001",
    "query": "What are the user preferences?",
    "limit": 10
  }'
    </div>

    <h2>Quick Links</h2>
    <ul>
      <li><a href="${dashboardUrl}">Dashboard</a> - View usage and manage your account</li>
      <li><a href="${dashboardUrl}/api-keys">API Keys</a> - Manage your API keys</li>
      <li><a href="https://docs.memvault.com">Documentation</a> - Full API reference</li>
    </ul>

    <h2>Need Help?</h2>
    <p>If you have any questions or run into issues, don't hesitate to reach out:</p>
    <ul>
      <li>📧 Email: support@memvault.com</li>
      <li>💬 Discord: discord.gg/memvault</li>
    </ul>

    <div class="footer">
      <p>© 2025 MemVault - Memory as a Service</p>
      <p>You're receiving this email because you signed up for MemVault.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export const emailService = {
  sendWelcomeEmail,
};
