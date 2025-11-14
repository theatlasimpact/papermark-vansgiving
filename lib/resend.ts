import { JSXElementConstructor, ReactElement } from "react";
import { render, toPlainText } from "@react-email/render";
import { Resend } from "resend";
import type { SendVerificationRequestParams } from "next-auth/providers/email";
import { log, nanoid } from "@/lib/utils";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const sendEmail = async ({
  to,
  subject,
  react,
  from,
  marketing,
  system,
  verify,
  test,
  cc,
  replyTo,
  scheduledAt,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  from?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  test?: boolean;
  cc?: string | string[];
  replyTo?: string;
  scheduledAt?: string;
  unsubscribeUrl?: string;
}) => {
  if (!resend) {
    throw new Error("Resend not initialized");
  }

  const html = await render(react);
  const plainText = toPlainText(html);

  const fromAddress =
    from ??
    (marketing
      ? 'Vansgiving <hello@joinvansgiving.com>'
      : 'Vansgiving <login@joinvansgiving.com>');

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: test ? "delivered@resend.dev" : to,
      cc,
      replyTo: replyTo ?? "hello@joinvansgiving.com",
      subject,
      react,
      scheduledAt,
      text: plainText,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
        ...(unsubscribeUrl ? { "List-Unsubscribe": unsubscribeUrl } : {}),
      },
    });

    if (error) {
      log({
        message: `Resend returned error: ${error.name}\n${error.message}`,
        type: "error",
        mention: true,
      });
      throw error;
    }

    return data;
  } catch (exception) {
    log({
      message: `Unexpected error when sending email: ${exception}`,
      type: "error",
      mention: true,
    });
    throw exception;
  }
};

export async function sendVerificationRequest(
  params: SendVerificationRequestParams
) {
  const { identifier, url, provider } = params;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const fromAddress =
    (provider && (provider as any).from) ||
    "Vansgiving Sponsor Deck <login@joinvansgiving.com>";

  const replyToAddress =
    (provider && (provider as any).replyTo) || "hello@joinvansgiving.com";

  const loginUrl = url;
  const host = new URL(loginUrl).host;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">
      <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Your Papermark Login Link</h1>
      <p style="margin-bottom: 16px;">Click the button below to sign in to your Papermark account.</p>
      <p style="margin-bottom: 24px;">
        <a href="${loginUrl}" style="display: inline-block; padding: 10px 18px; border-radius: 999px; background: #111827; color: #ffffff; text-decoration: none; font-weight: 600;">
          Sign in
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
        If the button doesn’t work, copy and paste this link:<br />
        <span style="word-break: break-all;">${loginUrl}</span>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 12px;">
        This link will only work for ${identifier} and may expire soon.
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
        Sent via ${host}
      </p>
    </div>
  `;

  const text = `Sign in link:\n${loginUrl}\n\nThis link is for ${identifier}.`;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: identifier,
    subject: "Your Papermark Login Link",
    html,
    text,
    reply_to: replyToAddress,
  } as any);

  if (error) {
    throw new Error("Resend sendVerificationRequest failed: " + error.message);
  }
}
