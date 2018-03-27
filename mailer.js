require('dotenv').config();

const domain = process.env.MAILGUN_DOMAIN;
const apiKey = process.env.MAILGUN_APIKEY;

var mailgun = require('mailgun-js')({ 
  apiKey: apiKey,
  domain: domain
});
var MailComposer = require('nodemailer/lib/mail-composer');
 
module.exports.mail = (to, subject, message, messageHtml) => {
  const mailOptions = {
    from: `no-reply@${domain}`,
    to: to,
    subject: subject,
    text: message,
    html: messageHtml
  };

  var mail = new MailComposer(mailOptions);

  mail.compile().build((err, message) => {

    var dataToSend = {
      to: to,
      message: message.toString('ascii')
    };

    mailgun.messages().sendMime(dataToSend, (sendError, body) => {
      if (sendError) {
        console.log(sendError);
        return;
      }
    });
  });
}