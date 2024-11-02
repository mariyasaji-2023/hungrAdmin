const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
// const authMiddleware = require('../middlewares/authMiddleware');

router.post('/sendOTP',adminController.sendOTP)
router.post('/verifyOTP',adminController.verifyOTP)

module.exports = router;