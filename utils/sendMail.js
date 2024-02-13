import * as nodemailer from "nodemailer";
async function sendMail(email, body, subject, attachments) {
  try {
    // Send email notifications to authors
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const response = await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: subject,
      html: body,
      attachments,
    });

    console.log("Email sent");
  } catch (error) {
    console.log("mail error", error);
  }
}

export default sendMail;
