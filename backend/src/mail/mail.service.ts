import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

// Force Node to prioritize IPv4 over IPv6 for DNS lookups
// This fixes the ENETUNREACH error when connecting to smtp.gmail.com
dns.setDefaultResultOrder('ipv4first');

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly apiKey: string;
    private readonly frontendUrl: string;
    private readonly apiUrl = 'https://api.zeptomail.in/v1.1/email/template';

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        this.apiKey = this.configService.get<string>('zeptoMail.apiKey') || '';
        this.frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:5173';
    }

    /**
     * Helper to get nodemailer transporter if SMTP is configured for the active branding/partner
     */
    private async getSmtpTransporter(partner: any) {
        const hasSmtp = partner?.smtpHost && partner?.smtpPort && partner?.smtpUser && partner?.smtpPass;
        if (!hasSmtp) {
            return null;
        }

        try {
            // Force IPv4 lookup to prevent ENETUNREACH on IPv6
            const { address } = await dns.promises.lookup(partner.smtpHost, { family: 4 });
            this.logger.log(`Resolved SMTP host ${partner.smtpHost} to IPv4: ${address}`);

            return nodemailer.createTransport({
                host: address, // use the IPv4 address directly
                port: Number(partner.smtpPort),
                secure: partner.smtpSecure ?? false,
                auth: {
                    user: partner.smtpUser,
                    pass: partner.smtpPass,
                },
                tls: {
                    servername: partner.smtpHost, // maintain SNI for SSL certificate validation
                },
                connectionTimeout: 10000, 
                greetingTimeout: 10000,
                socketTimeout: 15000,
            });
        } catch (error) {
            this.logger.error(`Failed to initialize SMTP transporter: ${error.message}`);
            return null;
        }
    }

    private getBaseUrl(partner: any): string {
        if (partner?.domain) {
            return partner.domain.startsWith('http') ? partner.domain.replace(/\/+$/, '') : `https://${partner.domain.replace(/\/+$/, '')}`;
        }
        return this.frontendUrl.replace(/\/+$/, '');
    }

    /**
     * Helper to wrap HTML content with global branding styling (premium aesthetics)
     */
    private getEmailWrapperHtml(contentHtml: string, title: string, partner: any): string {
        const primaryColor = partner?.primaryColor || '#3d52a0';
        const accentColor = partner?.accentColor || '#ed8f55';
        const platformName = partner?.name || 'Cloud PBX';
        let logoUrl = partner?.logoMain || partner?.logoSidebar || '';

        const baseUrl = this.getBaseUrl(partner);
        if (logoUrl && logoUrl.startsWith('/')) {
            logoUrl = `${baseUrl}${logoUrl}`;
        }

        let logoElement = `<h1 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${platformName}</h1>`;
        if (logoUrl) {
            logoElement = `<img src="${logoUrl}" alt="${platformName}" style="max-height: 45px; max-width: 180px; object-fit: contain; display: block; margin: 0 auto;" />`;
        }

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9; text-align: center;">
              ${logoElement}
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px; color: #334155; font-size: 15px; line-height: 1.6; font-weight: 400;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 13px;">
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #334155;">${platformName} Support</p>
              <p style="margin: 0 0 16px 0; color: #64748b;">
                Email: <a href="mailto:${partner?.supportEmail || 'support@telecom-platform.com'}" style="color: ${primaryColor}; text-decoration: none; font-weight: 600;">${partner?.supportEmail || 'support@telecom-platform.com'}</a>
                ${partner?.supportPhone ? ` &bull; Phone: <span style="font-weight: 600; color: #334155;">${partner.supportPhone}</span>` : ''}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;
    }

    async sendPasswordResetEmail(email: string, name: string, token: string, companyName: string = 'Cloud PBX') {
        const partner = await this.prisma.partner.findFirst();
        const platformName = partner?.name || companyName || 'Cloud PBX';
        const primaryColor = partner?.primaryColor || '#3d52a0';
        
        const baseUrl = this.getBaseUrl(partner);
        const resetUrl = `${baseUrl}/reset?token=${token}`;

        // Attempt SMTP
        const transporter = await this.getSmtpTransporter(partner);
        if (transporter) {
            this.logger.log(`Sending password reset email to ${email} via custom SMTP...`);
            const contentHtml = `
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 800; text-align: center;">Reset Your Password</h2>
              <p style="margin: 0 0 16px 0;">Hi ${name || 'User'},</p>
              <p style="margin: 0 0 24px 0;">We received a request to reset your password for your ${platformName} account. Click the button below to choose a new password. This link is only valid for 10 minutes.</p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="background-color: ${primaryColor}; color: #ffffff; display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(61, 82, 160, 0.2);">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px; text-align: center;">Or copy and paste this URL into your browser:</p>
              <p style="margin: 0 0 24px 0; font-size: 12px; word-break: break-all; text-align: center; color: #94a3b8;"><a href="${resetUrl}" style="color: ${primaryColor};">${resetUrl}</a></p>
              
              <p style="margin: 0; border-top: 1px solid #f1f5f9; padding-top: 24px; color: #94a3b8; font-size: 13px; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
            `;
            const html = this.getEmailWrapperHtml(contentHtml, 'Reset Your Password', partner);

            try {
                await transporter.sendMail({
                    from: {
                        name: partner?.smtpFromName || `${platformName} Portal`,
                        address: partner?.smtpFromEmail || 'no-reply@telecom-platform.com',
                    },
                    to: email,
                    subject: `Reset Your Password - ${platformName}`,
                    html: html,
                });
                this.logger.log(`Password reset email sent successfully via SMTP to ${email}`);
                return;
            } catch (smtpError) {
                this.logger.error(`SMTP delivery failed, falling back to ZeptoMail: ${smtpError.message}`);
            }
        }

        // ZeptoMail Fallback
        if (!this.apiKey) {
            this.logger.warn('ZeptoMail API key not configured. Skipping email send.');
            return;
        }

        const dateString = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const yearString = new Date().getFullYear().toString();

        const payload = {
            mail_template_key: "pass-reset",
            from: {
                address: partner?.supportEmail || "no-reply@telecom-platform.com",
                name: `${platformName} Portal`
            },
            to: [
                {
                    email_address: {
                        address: email,
                        name: name || "User",
                    }
                }
            ],
            merge_info: {
                user_name: name || "User",
                company_name: platformName,
                reset_url: resetUrl,
                expiry_minutes: "10",
                support_email: partner?.supportEmail || "support@telecom-platform.com",
                year: yearString,
                date: dateString
            }
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text();
                this.logger.error(`Failed to send email to ${email} via ZeptoMail: ${response.status} - ${errorData}`);
            } else {
                this.logger.log(`Password reset email sent successfully via ZeptoMail to ${email}`);
            }
        } catch (error) {
            this.logger.error(`Error sending email to ${email} via ZeptoMail`, error);
        }
    }

    async sendSupportInvitationEmail(email: string, name: string, token: string, adminName: string, tenantName: string) {
        const partner = await this.prisma.partner.findFirst();
        const platformName = partner?.name || 'Cloud PBX';
        const primaryColor = partner?.primaryColor || '#3d52a0';

        const baseUrl = this.getBaseUrl(partner);
        const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

        // Attempt SMTP
        const transporter = await this.getSmtpTransporter(partner);
        if (transporter) {
            this.logger.log(`Sending support invitation email to ${email} via custom SMTP...`);
            const contentHtml = `
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 800; text-align: center;">Support Team Invitation</h2>
              <p style="margin: 0 0 16px 0;">Hi ${name || 'Agent'},</p>
              <p style="margin: 0 0 24px 0;">You have been invited by <strong>${adminName}</strong> to join the support team for <strong>${tenantName}</strong> on the ${platformName} portal.</p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="background-color: ${primaryColor}; color: #ffffff; display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(61, 82, 160, 0.2);">Accept Invitation</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px; text-align: center;">Or copy and paste this URL into your browser:</p>
              <p style="margin: 0 0 24px 0; font-size: 12px; word-break: break-all; text-align: center; color: #94a3b8;"><a href="${inviteUrl}" style="color: ${primaryColor};">${inviteUrl}</a></p>
              
              <p style="margin: 0; border-top: 1px solid #f1f5f9; padding-top: 24px; color: #94a3b8; font-size: 13px; text-align: center;">This invitation link will expire soon. Please accept it as soon as possible.</p>
            `;
            const html = this.getEmailWrapperHtml(contentHtml, 'Support Team Invitation', partner);

            try {
                await transporter.sendMail({
                    from: {
                        name: partner?.smtpFromName || `${platformName} Portal`,
                        address: partner?.smtpFromEmail || 'no-reply@telecom-platform.com',
                    },
                    to: email,
                    subject: `Support Team Invitation - ${platformName}`,
                    html: html,
                });
                this.logger.log(`Support invitation email sent successfully via SMTP to ${email}`);
                return;
            } catch (smtpError) {
                this.logger.error(`SMTP delivery failed, falling back to ZeptoMail: ${smtpError.message}`);
            }
        }

        // ZeptoMail Fallback
        if (!this.apiKey) {
            this.logger.warn('ZeptoMail API key not configured. Skipping invite email send.');
            return;
        }

        const yearString = new Date().getFullYear().toString();

        const payload = {
            mail_template_key: "sup-user-inv",
            from: {
                address: partner?.supportEmail || "no-reply@telecom-platform.com",
                name: `${platformName} Portal`
            },
            to: [{
                email_address: {
                    address: email,
                    name: name || "Support Agent",
                }
            }],
            merge_info: {
                user_name: name || "Support Agent",
                admin_name: adminName,
                tenant_name: tenantName || "Your Team",
                invite_url: inviteUrl,
                year: yearString
            }
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text();
                this.logger.error(`Failed to send invite to ${email} via ZeptoMail: ${response.status} - ${errorData}`);
            } else {
                this.logger.log(`Support invitation email sent successfully via ZeptoMail to ${email}`);
            }
        } catch (error) {
            this.logger.error(`Error sending invite email to ${email} via ZeptoMail`, error);
        }
    }

    async sendOnboardingCompletionEmail(
        email: string,
        name: string,
        customerCode: string,
        phoneNum: string,
        extensionListHtml: string,
        customerEmail: string,
        planName: string = 'N/A',
        quoteNo: string = 'N/A',
        password: string = 'Welcome123!'
    ) {
        const partner = await this.prisma.partner.findFirst();
        const platformName = partner?.name || 'Cloud PBX';
        const primaryColor = partner?.primaryColor || '#3d52a0';

        const baseUrl = this.getBaseUrl(partner);
        const loginUrl = `${baseUrl}/login`;

        // Attempt SMTP
        const transporter = await this.getSmtpTransporter(partner);
        if (transporter) {
            this.logger.log(`Sending onboarding completion email to ${email} via custom SMTP...`);
            const contentHtml = `
              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 800; text-align: center;">Welcome Aboard!</h2>
              <p style="margin: 0 0 24px 0; text-align: center; color: #64748b; font-size: 14px;">Your Cloud PBX system has been provisioned successfully.</p>
              
              <p style="margin: 0 0 16px 0;">Hi ${name || 'Customer'},</p>
              <p style="margin: 0 0 24px 0;">Your onboarding is complete. Below are your login credentials and PBX account details:</p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 32px;">
                <h3 style="margin: 0 0 16px 0; color: #334155; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Account Details</h3>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;" width="160">Username/Email:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${customerEmail || email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Extension Username:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${customerCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temporary Password:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700; font-size: 15px;">${password}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Customer Code:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${customerCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Plan:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${planName}</td>
                  </tr>
                  ${quoteNo && quoteNo !== 'N/A' ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Quote Number:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${quoteNo}</td>
                  </tr>` : ''}
                  ${phoneNum && phoneNum !== 'N/A' ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Provisioned Phone:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${phoneNum}</td>
                  </tr>` : ''}
                </table>
              </div>

              <!-- Extensions List -->
              ${extensionListHtml ? `
              <div style="margin-bottom: 32px;">
                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 14px; font-weight: 700;">Provisioned Extensions</h3>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-family: monospace; overflow-x: auto;">
                  ${extensionListHtml}
                </div>
              </div>` : ''}

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="background-color: ${primaryColor}; color: #ffffff; display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(61, 82, 160, 0.2);">Log In to Portal</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; border-top: 1px solid #f1f5f9; padding-top: 24px; color: #64748b; font-size: 13px; text-align: center;">For security, we recommend that you log in and change your temporary password immediately upon your first access.</p>
            `;
            const html = this.getEmailWrapperHtml(contentHtml, 'Welcome Aboard!', partner);

            try {
                await transporter.sendMail({
                    from: {
                        name: partner?.smtpFromName || `${platformName} Portal`,
                        address: partner?.smtpFromEmail || 'no-reply@telecom-platform.com',
                    },
                    to: email,
                    subject: `Welcome Aboard - Your Cloud PBX is Ready!`,
                    html: html,
                });
                this.logger.log(`Onboarding completion email sent successfully via SMTP to ${email}`);
                return;
            } catch (smtpError) {
                this.logger.error(`SMTP delivery failed, falling back to ZeptoMail: ${smtpError.message}`);
            }
        }

        // ZeptoMail Fallback
        if (!this.apiKey) {
            this.logger.warn('ZeptoMail API key not configured. Skipping onboarding completion email send.');
            return;
        }

        const payload = {
            mail_template_key: "ob-post-payment",
            from: {
                address: partner?.supportEmail || "no-reply@telecom-platform.com",
                name: `${platformName} Portal`
            },
            to: [{
                email_address: {
                    address: email,
                    name: name || "Customer",
                }
            }],
            merge_info: {
                customer_name: name || "Customer",
                customer_email: customerEmail || email,
                Password: password,
                customer_code: customerCode,
                extension_login: customerCode,
                plan_name: planName,
                quote_no: quoteNo,
                phone_num: phoneNum || "N/A",
                login_url: loginUrl,
                onboarding_url: loginUrl,
                extension_list: extensionListHtml,
                current_year: String(new Date().getFullYear())
            }
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.text();
                this.logger.error(`Failed to send onboarding completion email to ${email} via ZeptoMail: ${response.status} - ${errorData}`);
            } else {
                this.logger.log(`Onboarding completion email sent successfully via ZeptoMail to ${email}`);
            }
        } catch (error) {
            this.logger.error(`Error sending onboarding completion email to ${email} via ZeptoMail`, error);
        }
    }
}
