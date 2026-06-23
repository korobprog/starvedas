import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type EmailMessage = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

export type EmailSendResult =
  | {
      skipped: false;
      messageId: string;
    }
  | {
      reason: string;
      skipped: true;
    };

type SmtpConfig = {
  fromEmail: string;
  fromName: string;
  host: string;
  password: string;
  port: number;
  secure: boolean;
  user: string;
};

const defaultFromEmail = "service@chintamanidhama.ru";
const defaultFromName = "Чинтамани Дхама";

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
  null;

function clean(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed || undefined;
}

function getBooleanEnv(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getSmtpConfig(): SmtpConfig | null {
  const host = clean(process.env.SMTP_HOST) ?? "smtp.jino.ru";
  const port = Number(clean(process.env.SMTP_PORT) ?? "587");
  const user =
    clean(process.env.SMTP_USER) ??
    clean(process.env.SMTP_LOGIN) ??
    clean(process.env.EMAIL_SERVER_USER);
  const password =
    clean(process.env.SMTP_PASSWORD) ??
    clean(process.env.SMTP_PASS) ??
    clean(process.env.EMAIL_SERVER_PASSWORD);
  const fromEmail =
    clean(process.env.SMTP_FROM_EMAIL) ??
    clean(process.env.EMAIL_FROM) ??
    user ??
    defaultFromEmail;
  const fromName = clean(process.env.SMTP_FROM_NAME) ?? defaultFromName;

  if (!user || !password || !Number.isInteger(port)) {
    return null;
  }

  return {
    fromEmail,
    fromName,
    host,
    password,
    port,
    secure: getBooleanEnv(process.env.SMTP_SECURE, port === 465),
    user
  };
}

function getTransporter() {
  const config = getSmtpConfig();

  if (!config) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      auth: {
        pass: config.password,
        user: config.user
      },
      host: config.host,
      port: config.port,
      secure: config.secure
    });
  }

  return {
    config,
    transporter
  };
}

export function isEmailConfigured() {
  return Boolean(getSmtpConfig());
}

export async function verifyEmailTransport() {
  const smtp = getTransporter();

  if (!smtp) {
    return {
      ok: false,
      reason: "SMTP_USER/SMTP_PASSWORD не настроены"
    };
  }

  await smtp.transporter.verify();

  return {
    fromEmail: smtp.config.fromEmail,
    host: smtp.config.host,
    ok: true,
    port: smtp.config.port,
    secure: smtp.config.secure
  };
}

export async function sendEmail(
  message: EmailMessage
): Promise<EmailSendResult> {
  const smtp = getTransporter();

  if (!smtp) {
    return {
      reason: "SMTP_USER/SMTP_PASSWORD не настроены",
      skipped: true
    };
  }

  const result = await smtp.transporter.sendMail({
    from: {
      address: smtp.config.fromEmail,
      name: smtp.config.fromName
    },
    html: message.html,
    subject: message.subject,
    text: message.text,
    to: message.to
  });

  return {
    messageId: result.messageId,
    skipped: false
  };
}
