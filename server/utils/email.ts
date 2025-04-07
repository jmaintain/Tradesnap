import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import * as crypto from 'crypto';

// AWS SES configuration
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Generate a random token for email verification
 * @returns Random token string
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate expiration date for verification token
 * @param hours Number of hours until token expires
 * @returns Date object representing expiration time
 */
export function calculateTokenExpiry(hours: number = 24): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hours);
  return expiryDate;
}

/**
 * Send email verification link using Amazon SES
 * @param to Recipient email address
 * @param token Verification token
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const verificationLink = `${baseUrl}/verify/${token}`;
    
    const params: SendEmailCommandInput = {
      Source: process.env.EMAIL_FROM || 'no-reply@tradetrack.app', // Should be a verified sender in SES
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: 'Verify your TradeSnap account',
        },
        Body: {
          Html: {
            Data: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0066cc;">Welcome to TradeSnap!</h2>
                <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
                <p style="margin: 25px 0;">
                  <a href="${verificationLink}" 
                     style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Verify Email Address
                  </a>
                </p>
                <p>Or copy and paste this URL into your browser:</p>
                <p>${verificationLink}</p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you did not create an account, please ignore this email.</p>
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                  <p>© ${new Date().getFullYear()} TradeSnap. All rights reserved.</p>
                </div>
              </div>
            `,
          },
          Text: {
            Data: `
              Welcome to TradeSnap!
              
              Thank you for signing up. Please verify your email address by clicking the link below:
              
              ${verificationLink}
              
              This verification link will expire in 24 hours.
              
              If you did not create an account, please ignore this email.
              
              © ${new Date().getFullYear()} TradeSnap. All rights reserved.
            `,
          },
        },
      },
    };
    
    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    
    console.log(`Verification email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}