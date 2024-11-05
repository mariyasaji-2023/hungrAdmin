const Admin = require('../models/adminModel');
const twilio = require('twilio');
const moment = require('moment');
require('dotenv').config();


const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


const sendOTP = async (req, res) => {
    const { mobile, name } = req.body;

    if (mobile !== process.env.COMPANY_NUMBER) {
        return res.status(403).json({ message: 'Unauthorized mobile number' });
    }

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP for ${mobile}: ${otp}`);

        // Send OTP using Twilio with `from` number instead of messagingServiceSid
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            to: mobile,
            from: process.env.TWILIO_PHONE_NUMBER // Use Twilio phone number here
        });

        // Store the OTP and login details in MongoDB
        await Admin.create({ name, mobile, otp });

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error("Failed to send OTP:", error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};


const verifyOTP = async (req, res) => {
    const { mobile, otp, name } = req.body;

    try {
        const admin = await Admin.findOne({ mobile, otp });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid OTP or mobile number' });
        }

        // Update login time and clear OTP after successful login
        admin.loginTime = moment().toDate();
        admin.otp = null; // Clear OTP after verification
        await admin.save();

        res.status(200).json({
            message: 'Login successful',
            loginTime: admin.loginTime,
            name: admin.name,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'OTP verification failed' });
    }
}

module.exports = { sendOTP, verifyOTP }