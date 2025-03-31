
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(
  toEmail: string,
  subject: string,
  content: string
) {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Digital Shopi <no-reply@digitalshopi.in>",
        to: [toEmail],
        subject: subject,
        html: content,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Email sending failed:", JSON.stringify(data));
      throw new Error(`Failed to send email: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APP_URL = Deno.env.get("APP_URL") || "https://app.digitalshopi.in";
    
    // Extract notification data from request body
    const {
      clientId,
      clientName,
      clientEmail,
      senderName,
      message,
      isFromClient
    } = await req.json();

    // Validate required fields
    if (isFromClient && (!clientName || !message)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clientName and message are required for client messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isFromClient && (!clientEmail || !senderName || !message)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clientEmail, senderName, and message are required for admin messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare email content based on sender
    if (isFromClient) {
      // Send notification to admin
      const adminSubject = `${clientName} sent you a message`;
      const adminContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New message from ${clientName}</h2>
          <p>You've received a new message from ${clientName}:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">${message}</p>
          </div>
          <p>
            <a href="${APP_URL}/admin/chat/${clientId}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View and Reply
            </a>
          </p>
        </div>
      `;

      await sendEmail("support@digitalshopi.in", adminSubject, adminContent);
    } else {
      // Send notification to client
      const clientSubject = "You have a new message from Digital Shopi";
      const clientContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New message from Digital Shopi</h2>
          <p>You've received a new message from ${senderName}:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">${message}</p>
          </div>
          <p>
            <a href="${APP_URL}/client/chat" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to View and Reply
            </a>
          </p>
        </div>
      `;

      await sendEmail(clientEmail, clientSubject, clientContent);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Error processing notification request:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
