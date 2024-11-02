const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

client.messages
    .create({
        body: 'Hello from Twilio!',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.COMPANY_NUMBER,
    })
    .then(message => console.log(`Message SID: ${message.sid}`))
    .catch(error => console.error('Error sending message:', error));
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN);
    console.log('From Number:', process.env.TWILIO_PHONE_NUMBER);
    console.log('To Number:', process.env.COMPANY_NUMBER);
    