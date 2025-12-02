import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function isAllowedEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function sendEmail(mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendInvitationEmail(email, link, audioName) {
  if (!(await isAllowedEmail(email))) {
    return { success: false, reason: 'email not allowed' };
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Te han invitado a ver una transcripción: ${audioName}`,
    html: `<p>Te han invitado a ver la transcripción: <b>${audioName}</b>.</p><p><a href="${link}">Abrir transcripción</a></p>`,
  };

  return await sendEmail(mailOptions);
}

export async function sendShareEmail(emailDestino, link, titulo) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emailDestino,
    subject: titulo || 'Transcripción compartida',
    html: `<p>Se ha compartido una transcripción contigo.</p><p><a href="${link}">Abrir transcripción</a></p>`,
  };

  return await sendEmail(mailOptions);
}