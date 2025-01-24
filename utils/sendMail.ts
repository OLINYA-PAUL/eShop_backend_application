if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: "config/.env",
  });
}

import nodeMailer, { Transporter } from "nodemailer";
import EJS from "ejs";
import path from "path";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

export const sendMail = async (option: EmailOptions) => {
  const transport: Transporter = nodeMailer.createTransport({
    host: process.env.SMPT_HOST,
    port: parseInt(process.env.SMPT_PORT || "587"),
    service: process.env.SMPT_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    logger: true,
    debug: true,
  });

  const { email, subject, template, data } = option;

  const templatePath = path.join(__dirname, "../mails", template);

  const html: string = await EJS.renderFile(templatePath, data);

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject,
    html,
  };

  try {
    await transport.sendMail(mailOptions);
  } catch (error: any) {
    return error.message;
  }
};
