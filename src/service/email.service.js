import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.mailtrap.io",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
});

export const sendTicketEmail = async (userEmail, eventTitle, qrToken, qrCodeDataUrl) => {
  try {
    const qrImage = qrCodeDataUrl
      ? `<p><img src="${qrCodeDataUrl}" alt="Ticket QR" width="220" height="220" /></p>`
      : "";

    await transporter.sendMail({
      from: '"EventOps Platform" <support@eventops.com>',
      to: userEmail,
      subject: `تأكيد حجز لفعالية ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>مرحباً بك!</h2>
          <p>تم تأكيد حجزك بنجاح لفعالية <strong>${eventTitle}</strong></p>
          <p>كود التذكرة (QR Token):</p>
          <div style="background: #f4f4f4; padding: 10px; font-family: monospace; font-size: 16px;">${qrToken}</div>
          ${qrImage}
          <p>يرجى إبراز هذا الكود عند الدخول للفعالية</p>
          <br>
          <p>شكراً لاستخدامك منصة EventOps</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};
