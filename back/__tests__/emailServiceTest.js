// Mock nodemailer before importing the service
const mockTransporter = {
  sendMail: jest.fn(),
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

const nodemailer = require('nodemailer');
const { isAllowedEmail, sendEmail, sendInvitationEmail, sendShareEmail } = require('../services/emailService');

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAllowedEmail', () => {
    it('debería retornar true para email permitido', async () => {
      const result = await isAllowedEmail('allowed@example.com');
      expect(result).toBe(true);
    });

    it('debería retornar false para email no permitido', async () => {
      const result = await isAllowedEmail('notallowed@example.com');
      expect(result).toBe(false);
    });

    it('debería retornar false para email vacío', async () => {
      const result = await isAllowedEmail('');
      expect(result).toBe(false);
    });

    it('debería retornar false para email null', async () => {
      const result = await isAllowedEmail(null);
      expect(result).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('debería enviar email exitosamente', async () => {
      const mailOptions = { to: 'allowed@example.com', subject: 'Test' };
      const mockInfo = { messageId: '123' };
      mockTransporter.sendMail.mockResolvedValue(mockInfo);

      const result = await sendEmail(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(mailOptions);
      expect(result).toEqual({ success: true, info: mockInfo });
    });

    it('debería manejar error al enviar email', async () => {
      const mailOptions = { to: 'allowed@example.com', subject: 'Test' };
      const error = new Error('Send failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const result = await sendEmail(mailOptions);

      expect(result).toEqual({ success: false, error: 'Send failed' });
    });
  });

  describe('sendInvitationEmail', () => {
    it('debería enviar invitación exitosamente', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const result = await sendInvitationEmail('allowed@example.com', 'http://example.com', 'Audio Test');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: 'allowed@example.com',
        subject: 'Te han invitado a ver una transcripción: Audio Test',
        html: expect.stringContaining('Audio Test'),
      });
      expect(result).toEqual({ success: true, info: { messageId: '123' } });
    });

    it('debería retornar error para email no permitido', async () => {
      const result = await sendInvitationEmail('notallowed@example.com', 'http://example.com', 'Audio Test');

      expect(result).toEqual({ success: false, reason: 'email not allowed' });
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendShareEmail', () => {
    it('debería enviar email de compartir exitosamente', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const result = await sendShareEmail('allowed@example.com', 'http://example.com', 'Transcripción compartida');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: 'allowed@example.com',
        subject: 'Transcripción compartida',
        html: expect.stringContaining('http://example.com'),
      });
      expect(result).toEqual({ success: true, info: { messageId: '123' } });
    });

    it('debería usar título por defecto si no se proporciona', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

      const result = await sendShareEmail('allowed@example.com', 'http://example.com');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: 'allowed@example.com',
        subject: 'Transcripción compartida',
        html: expect.any(String),
      });
      expect(result).toEqual({ success: true, info: { messageId: '123' } });
    });
  });
});