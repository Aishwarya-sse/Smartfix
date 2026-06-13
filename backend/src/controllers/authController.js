const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getModels = () => require('../models');
const { sendEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'smartfix_secret_key_123!';

// Register a new user/partner
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, partnerCategory, latitude, longitude, phone, upiAddress, emergencyContact } = req.body;
    const { User } = getModels();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Account with this email already exists' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Prepare new user object
    const userPayload = {
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || '',
      otp: otpCode,
      otpExpires,
      isVerified: false
    };

    if (role === 'partner') {
      userPayload.partnerCategory = partnerCategory || 'other';
      userPayload.latitude = Number(latitude) || 13.0827; // Default Chennai Lat
      userPayload.longitude = Number(longitude) || 80.2707; // Default Chennai Lng
      userPayload.isAvailable = true;
      userPayload.upiAddress = upiAddress || '';
      userPayload.emergencyContact = emergencyContact || '';
    }

    // Save user
    const newUser = await User.create(userPayload);

    // Send OTP Email
    const emailSubject = 'Verify Your SmartFix Account';
    const emailText = `Hello ${name},\n\nThank you for registering on SmartFix. Your 6-digit verification OTP code is: ${otpCode}\n\nThis OTP will expire in 10 minutes. Please enter this code in the app to activate your account.`;
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #a284f9; text-align: center; margin-bottom: 24px; font-weight: 600;">SmartFix Account Verification</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">Hello <strong>${name}</strong>,</p>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">Thank you for signing up for SmartFix as a <strong>${role.toUpperCase()}</strong>. To securely verify your account, please use the following one-time password:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; text-align: center; padding: 20px; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #a284f9; border-radius: 12px; margin: 30px 0;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">This verification code will expire in 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">If you did not initiate this request, you may safely disregard this message.</p>
      </div>
    `;

    await sendEmail(email, emailSubject, emailText, emailHtml);

    // Expose OTP in console log for painless developer setup
    console.log(` [DEV-OTP-ACCESS] Created user: ${email} | Verification OTP code is: ${otpCode}`);

    res.status(201).json({
      message: 'Registration successful. OTP sent to your email address.',
      email: newUser.email,
      role: newUser.role,
      isVerified: false
    });
  } catch (error) {
    console.error(' [Signup Error]:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

// Verify OTP code
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const { User } = getModels();

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified.' });
    }

    // Check OTP and expiration
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP code.' });
    }

    if (new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }

    // Update verified status
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Account successfully verified and activated.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        isVerified: true
      }
    });
  } catch (error) {
    console.error(' [OTP Verification Error]:', error);
    res.status(500).json({ error: 'Server error during OTP verification.' });
  }
};

// Login user/partner
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { User } = getModels();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Auto-seed Admin if logging in as admin and admin doesn't exist
    if (email && email.toLowerCase().trim() === 'admin@gmail.com') {
      const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
      if (!existingAdmin) {
        console.log(" [Seeding Admin] Creating default admin account in MongoDB...");
        const salt = await bcrypt.genSalt(10);
        const hashedAdminPassword = await bcrypt.hash('Admin', salt);
        await User.create({
          name: 'SmartFix Admin',
          email: 'admin@gmail.com',
          password: hashedAdminPassword,
          role: 'admin',
          isVerified: true
        });
        console.log(" [Seeding Admin] Admin account created successfully!");
      }
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Check verification status
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Account not verified. Please verify your OTP code.',
        unverified: true,
        email: user.email
      });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        partnerCategory: user.partnerCategory,
        latitude: user.latitude,
        longitude: user.longitude,
        phone: user.phone || ''
      }
    });
  } catch (error) {
    console.error(' [Login Error]:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { User } = getModels();

    
    // Fetch top 10 users from DB
    const topUsers = await User.find({ role: 'user' })
      .sort({ civicPoints: -1 })
      .limit(10)
      .select('name civicPoints badge');
      
    // Format to match frontend expectations
    const formatted = topUsers.map(u => ({
      name: u.name,
      pts: u.civicPoints,
      badge: u.badge || 'Silver'
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const { User } = getModels();
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    user.latitude = Number(latitude);
    user.longitude = Number(longitude);
    await user.save();
    
    res.status(200).json({
      message: 'Location successfully updated.',
      user: {
        id: user._id,
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (error) {
    console.error('❌ [Update Location Error]:', error);
    res.status(500).json({ error: 'Server error during location update.' });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { User } = getModels();

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Generate 6-digit OTP
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.otp = resetOtp;
    user.otpExpires = otpExpires;
    await user.save();

    const emailSubject = 'SmartFix Password Reset';
    const emailText = `Hello ${user.name},\n\nYour password reset OTP is: ${resetOtp}\n\nThis OTP will expire in 15 minutes.`;
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: #334155;">
        <h2 style="color: #a284f9; text-align: center; margin-bottom: 24px;">Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>We received a request to reset your SmartFix password. Please use the following OTP to proceed:</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #a284f9;">
          ${resetOtp}
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">This code is valid for 15 minutes.</p>
      </div>
    `;

    await sendEmail(email, emailSubject, emailText, emailHtml);
    console.log(`🔑 [DEV-OTP-ACCESS] Password reset OTP for ${email}: ${resetOtp}`);

    res.status(200).json({ message: 'Password reset OTP sent to your email.' });
  } catch (error) {
    console.error('❌ [Forgot Password Error]:', error);
    res.status(500).json({ error: 'Server error during forgot password.' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const { User } = getModels();

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP code.' });
    }

    if (new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been successfully reset.' });
  } catch (error) {
    console.error('❌ [Reset Password Error]:', error);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
};
