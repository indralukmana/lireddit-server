'use strict';
import nodemailer from 'nodemailer';

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(to: string, html: string) {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  // let testAccount = await nodemailer.createTestAccount();
  // console.log({ testAccount });

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      // user: testAccount.user, // generated ethereal user
      // pass: testAccount.pass, // generated ethereal password
      user: 'ramhagiw6ityxhzf@ethereal.email',
      pass: 'YCh4FPNr7stxFtDpa5',
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    // to: 'bar@example.com, baz@example.com', // list of receivers
    to,
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    // html: '<b>Hello world?</b>', // html body
    html,
  });

  console.log('Message sent: %s', info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}
