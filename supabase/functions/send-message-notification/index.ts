
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  clientId: string;
  clientName: string;
  clientEmail: string;
  senderName: string;
  message: string;
  isFromClient: boolean;
}

async function sendEmail(to: string, subject: string, htmlContent: string) {
  // Using direct email sending (Replace with your SMTP service)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`
    },
    body: JSON.stringify({
      from: "Digitalshopi Support <support@digitalshopi.in>",
      to: [to],
      subject: subject,
      html: htmlContent
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("Email sending failed:", error);
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { clientId, clientName, clientEmail, senderName, message, isFromClient }: NotificationRequest = await req.json();
    
    // Email to support when client sends a message
    if (isFromClient) {
      const adminSubject = `${clientName} sent you a message`;
      const adminHtml = `
        <h2>New message from ${clientName}</h2>
        <p><strong>Client Name:</strong> ${clientName}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>Log in to the admin dashboard to respond.</p>
        <p><a href="${Deno.env.get("APP_URL") || "https://app.digitalshopi.in"}/admin/chat/${clientId}">View Conversation</a></p>
      `;
      
      await sendEmail("support@digitalshopi.in", adminSubject, adminHtml);
      console.log("Admin notification email sent");
    } 
    // Email to client when admin sends a message
    else {
      const clientSubject = "You have received a new message from Digitalshopi";
      const clientHtml = `
        <h2>New message from Digitalshopi</h2>
        <p>You have received a new message from ${senderName} at Digitalshopi.</p>
        <p>Login to your client panel to view the message or respond.</p>
        <p><a href="${Deno.env.get("APP_URL") || "https://app.digitalshopi.in"}/client/chat">View Message</a></p>
      `;
      
      await sendEmail(clientEmail, clientSubject, clientHtml);
      console.log("Client notification email sent");
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error processing notification request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
