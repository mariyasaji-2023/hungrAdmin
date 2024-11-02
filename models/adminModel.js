const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    otp: { type: String },
    loginTime: { type: Date },
});

module.exports = mongoose.model('Admin', adminSchema);
