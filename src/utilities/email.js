import nodemailer from 'nodemailer';

let cachedTransporter = null;

async function getTransporter() {
    if (cachedTransporter) return cachedTransporter;

    // Real delivery when Gmail credentials are configured in .env
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        cachedTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        return cachedTransporter;
    }

    // Dev fallback: Ethereal test inbox (no real delivery, prints a preview link)
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
    console.log('No EMAIL_USER/EMAIL_PASS set - using Ethereal test inbox:', testAccount.user);
    return cachedTransporter;
}

export const sendEmail = async (options) => {
    try {
        const transporter = await getTransporter();

        const info = await transporter.sendMail({
            from: `"EventOps Team" <${process.env.EMAIL_USER || 'no-reply@eventops.local'}>`,
            to: options.email,
            subject: options.subject,
            html: options.html
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Email preview URL:', previewUrl);
        }

        return info;
    } catch (err) {
        // Sending must never break the signup flow
        console.error('Failed to send email:', err.message);
        return null;
    }
};
