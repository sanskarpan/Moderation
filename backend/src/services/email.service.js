const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Email send result
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Content Moderation" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send content flagged notification
 * @param {Object} user - User object
 * @param {string} contentType - Type of content
 * @param {string} reason - Reason for flagging
 * @returns {Promise<Object>} - Email send result
 */
const sendContentFlaggedNotification = async (user, contentType, reason) => {
  if (!user.emailNotification) {
    console.log(`Email notifications confirmed disabled for user ${user.id}. Skipping flagged notification.`);
    return null;
  }

  const subject = 'Your content has been flagged for moderation';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e53e3e;">Content Moderation Notification</h2>
      <p>Dear ${user.username},</p>
      <p>Your recent ${contentType.toLowerCase()} has been flagged for moderation for the following reason:</p>
      <div style="background-color: #f8f8f8; padding: 15px; border-left: 4px solid #e53e3e; margin: 20px 0;">
        <p style="margin: 0;">${reason}</p>
      </div>
      <p>Our moderation team will review your content as soon as possible. If your content is found to violate our community guidelines, it may be removed.</p>
      <p>If you believe this is an error, please wait for the moderation process to complete.</p>
      <p>Thank you for your understanding.</p>
      <p>Best regards,<br>The Moderation Team</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">
        You've received this email because you have enabled email notifications. 
        You can disable these notifications in your account settings.
      </p>
    </div>
  `;
  console.log(`Attempting to send 'content-flagged' email to ${user.email}`);
  return sendEmail({ email: user.email, subject, html });
};

/**
 * Send content approved notification
 * @param {Object} user - User object
 * @param {string} contentType - Type of content
 * @returns {Promise<Object>} - Email send result
 */
const sendContentApprovedNotification = async (user, contentType) => {
  if (!user.emailNotification) {
    console.log(`Email notifications disabled for user ${user.id}`);
    return null;
  }

  const subject = 'Your content has been approved';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #38a169;">Content Moderation Notification</h2>
      <p>Dear ${user.username},</p>
      <p>Your ${contentType.toLowerCase()} that was previously flagged for moderation has been reviewed and approved.</p>
      <p>Thank you for contributing positively to our community.</p>
      <p>Best regards,<br>The Moderation Team</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">
        You've received this email because you have enabled email notifications. 
        You can disable these notifications in your account settings.
      </p>
    </div>
  `;

  return sendEmail({ email: user.email, subject, html });
};

/**
 * Send content rejected notification
 * @param {Object} user - User object
 * @param {string} contentType - Type of content
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} - Email send result
 */
const sendContentRejectedNotification = async (user, contentType, reason) => {
  if (!user.emailNotification) {
    console.log(`Email notifications disabled for user ${user.id}`);
    return null;
  }

  const subject = 'Your content has been rejected';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e53e3e;">Content Moderation Notification</h2>
      <p>Dear ${user.username},</p>
      <p>Your ${contentType.toLowerCase()} that was flagged for moderation has been reviewed and rejected for the following reason:</p>
      <div style="background-color: #f8f8f8; padding: 15px; border-left: 4px solid #e53e3e; margin: 20px 0;">
        <p style="margin: 0;">${reason}</p>
      </div>
      <p>Please review our community guidelines to ensure your future contributions align with our standards.</p>
      <p>Thank you for your understanding.</p>
      <p>Best regards,<br>The Moderation Team</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">
        You've received this email because you have enabled email notifications. 
        You can disable these notifications in your account settings.
      </p>
    </div>
  `;

  return sendEmail({ email: user.email, subject, html });
};

module.exports = {
  sendEmail,
  sendContentFlaggedNotification,
  sendContentApprovedNotification,
  sendContentRejectedNotification,
};