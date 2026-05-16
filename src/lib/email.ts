/**
 * Email Service Interface
 * Currently mocked to log to console. Replace the implementation inside sendEmail 
 * with a real provider like Resend, SendGrid, or AWS SES later.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // MOCK IMPLEMENTATION
  console.log("=====================================");
  console.log("📧 MOCK EMAIL SENT");
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log("Body:");
  console.log(options.body);
  console.log("=====================================");

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return true;
}

export const EmailTemplates = {
  vendorWelcome: (email: string, tempPassword: string) => `
    Welcome to Passmark!
    
    An admin has created an account for your organization.
    Please log in using the following credentials:
    
    Email: ${email}
    Temporary Password: ${tempPassword}
    
    You will be prompted to complete your registration upon first login.
  `,
  passwordReset: (resetLink: string) => `
    You requested a password reset.
    Please click the link below to reset your password. The link is valid for 24 hours.
    
    ${resetLink}
  `,
  statusChange: (status: string, remarks?: string | null) => `
    There has been an update to your accreditation application.
    
    New Status: ${status}
    
    ${remarks ? `Admin Remarks: ${remarks}` : ""}
    
    Please log in to your dashboard to view more details.
  `
}
