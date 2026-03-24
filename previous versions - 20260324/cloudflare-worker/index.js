export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
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
      const body = await request.json();
      const { name, email, service, message, sendCopy } = body;
      const turnstileToken = body["cf-turnstile-response"];

      // Basic validation
      if (!name || !email || !service || !message) {
        return new Response("Missing required fields", { status: 400 });
      }

      // Validate Turnstile token
      if (!turnstileToken) {
        return new Response(JSON.stringify({ error: "Missing captcha verification" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const turnstileResult = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: request.headers.get("CF-Connecting-IP"),
        }),
      });

      const turnstileData = await turnstileResult.json();

      if (!turnstileData.success) {
        return new Response(JSON.stringify({ error: "Captcha verification failed" }), {
          status: 403,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const resendApiKey = env.RESEND_API_KEY;
      const adminEmail = env.ADMIN_EMAIL;

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
          from: "Stormberry AS - Form <info@stormberry.as>",
          to: [adminEmail],
          subject: subject,
          html: htmlBody,
          reply_to: email
        }
      ];

      // If user requested a copy
      if (sendCopy) {
        emailsToSend.push({
          from: "Stormberry AS <info@stormberry.as>",
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
