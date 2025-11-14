import LoginLink from "@/components/emails/verification-link";
import { sendEmail } from "@/lib/resend";

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  const emailTemplate = LoginLink({ url });
  try {
    await sendEmail({
      to: email as string,
      system: true,
      subject: "Your Papermark Login Link",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};
