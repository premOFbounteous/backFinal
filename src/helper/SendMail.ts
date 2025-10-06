import nodemailer from "nodemailer";

// It's better to load credentials from environment variables
// For now, they are hardcoded as in your example.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
   // --- START OF CHANGES ---
  port: 587, // Use port 587
  secure: false, // Port 587 starts insecure and upgrades to TLS
  // --- END OF CHANGES ---
  auth: {
    user: "anupamy140@gmail.com", // Your email
pass: "alblqpdenjpigauw",     // Your App Password
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
  },
});

// Define the function with types for its parameters
export default async function sendMail(to: string, subject: string, text: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: '"Broo code" <anupamy140@gmail.com>',
      to,      // Recipient's email
      subject, // Subject line
      text,    // Plain text body
      html,    // HTML body
    });

    console.log("Message sent:", info.messageId);
    return info; // It's good practice to return the result
  } catch (error) {
    console.error("Error sending email:", error);
    // Re-throw the error so the calling function knows something went wrong
    throw new Error("Failed to send email.");
  }
}