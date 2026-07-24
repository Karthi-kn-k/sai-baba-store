export class WhatsappService {
  static async sendOtp(phone: string, otp: string, purpose: string): Promise<boolean> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Standard log format
    console.log(`[WhatsappService Debug] Sending OTP WhatsApp to ${phone} with code ${otp} for ${purpose}`);
    console.log(`[WHATSAPP GATEWAY] Sending WhatsApp Message to ${phone}: verification otp from saibaba store along with otp ${otp}`);

    if (!token || !phoneId) {
      console.warn("[WhatsappService WARNING] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured in your .env file.");
      return false;
    }

    try {
      const cleanedPhone = phone.replace(/\D/g, ""); // Remove non-digits
      const recipient = cleanedPhone.startsWith("91") ? cleanedPhone : `91${cleanedPhone}`;

      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: {
            body: `verification otp from saibaba store along with otp ${otp}`
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[WhatsappService ERROR] Meta API failed:", errorData);
        return false;
      }

      console.log(`[WhatsappService] OTP WhatsApp successfully sent to ${phone}`);
      return true;
    } catch (error) {
      console.error("[WhatsappService ERROR] Exception in sendOtp:", error);
      return false;
    }
  }
}
