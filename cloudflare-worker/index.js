import { EmailMessage } from "cloudflare:email";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { name, email, service, message, sendCopy } = await request.json();

      // Basic validation
      if (!name || !email || !service || !message) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { 
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      const adminEmail = env.ADMIN_EMAIL; // Where inquiries should go
      const senderEmail = env.SENDER_EMAIL; // Verified sender email on Cloudflare

      if (!adminEmail || !senderEmail) {
        return new Response(JSON.stringify({ error: "Server error: Missing email configuration in Worker variables" }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      const subject = `New Inquiry: ${service} from ${name}`;
      const textBody = `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`;

      // Construct raw MIME email for Admin
      const adminMime = `From: ${senderEmail}\nTo: ${adminEmail}\nReply-To: ${email}\nSubject: ${subject}\n\n${textBody}`;
      const adminMsg = new EmailMessage(senderEmail, adminEmail, adminMime);
      
      // Send to Admin via Cloudflare native Send Email Binding (SEB)
      await env.SEB.send(adminMsg);

      // If user requested a copy
      if (sendCopy) {
        const copyMime = `From: ${senderEmail}\nTo: ${email}\nSubject: Copy of your inquiry: ${service}\n\nHi ${name},\n\nThank you for reaching out to Stormberry AS. We have received your message and will get back to you as soon as possible.\n\nYour Message:\n${message}`;
        const copyMsg = new EmailMessage(senderEmail, email, copyMime);
        await env.SEB.send(copyMsg);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }
  }
};
