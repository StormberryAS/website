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
        return new Response("Missing required fields", { status: 400 });
      }

      const resendApiKey = env.RESEND_API_KEY;
      const adminEmail = env.ADMIN_EMAIL; // The email of Stormberry where inquiries should go to

      if (!resendApiKey) {
        return new Response("Server error: Missing API Key", { status: 500 });
      }

      const subject = `New Inquiry: ${service} from ${name}`;
      const htmlBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      `;

      const emailsToSend = [
        {
          from: "Stormberry AS - Form <hello@stormberry.as>", // Update this when sending from your actual domain
          to: [adminEmail],
          subject: subject,
          html: htmlBody,
          reply_to: email
        }
      ];

      // If user requested a copy
      if (sendCopy) {
        emailsToSend.push({
          from: "Stormberry AS <hello@stormberry.as>", // Update to your domain
          to: [email],
          subject: `Copy of your inquiry to Stormberry: ${service}`,
          html: `
            <p>Hi ${name},</p>
            <p>Thank you for reaching out to Stormberry AS. We have received your message and will get back to you as soon as possible.</p>
            <hr />
            <p><strong>Your Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          `
        });
      }

      // Send emails via Resend API
      const promises = emailsToSend.map(emailPayload => 
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(emailPayload)
        })
      );

      const responses = await Promise.all(promises);
      
      const results = await Promise.all(responses.map(async r => ({
        ok: r.ok,
        status: r.status,
        data: await r.json().catch(() => null)
      })));

      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        console.error("Resend API Errors:", JSON.stringify(failed, null, 2));
        throw new Error(`Resend API Error: ${failed[0].data?.message || 'Unknown error'}`);
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
