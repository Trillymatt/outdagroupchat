import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function sendSms(to: string, body: string) {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !from) {
    console.warn("Twilio is not configured — skipping SMS send.");
    return null;
  }
  return getClient().messages.create({ to, from, body });
}
