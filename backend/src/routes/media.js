const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

// Get all media posts
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ isRemoved: { $ne: true } }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Server error fetching media posts.' });
  }
});

// Create a new post
router.post('/posts/create', auth, async (req, res) => {
  try {
    const { text, image, video, location } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Post text is required.' });
    }
    
    // Fetch actual user profile name from DB
    const userProfile = await User.findById(req.user.id);
    const name = userProfile ? userProfile.name : 'Anonymous Citizen';
    
    // Upload media to Cloudinary if provided
    const { uploadMedia } = require('../services/cloudinaryService');
    
    let uploadedImage = image;
    if (image) {
      const secureUrl = await uploadMedia(image);
      if (secureUrl) uploadedImage = secureUrl;
    }
    
    let uploadedVideo = video;
    if (video) {
      const secureUrl = await uploadMedia(video);
      if (secureUrl) uploadedVideo = secureUrl;
    }
    
    const newPost = await Post.create({
      userId: req.user.id,
      userName: name,
      text,
      image: uploadedImage,
      video: uploadedVideo,
      location: location || 'Local Zone',
      likes: [],
      comments: []
    });
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Server error creating post.' });
  }
});

// Like/Unlike a post
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    
    const userId = req.user.id;
    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    
    await post.save();
    res.status(200).json({ likes: post.likes });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Server error liking post.' });
  }
});

// Add comment to post
router.post('/posts/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    
    // Fetch commenter actual profile name from DB
    const userProfile = await User.findById(req.user.id);
    const name = userProfile ? userProfile.name : 'Anonymous Citizen';
    
    const comment = {
      userId: req.user.id,
      userName: name,
      text
    };
    
    post.comments.push(comment);
    await post.save();
    
    res.status(201).json(post.comments);
  } catch (error) {
    console.error('Error commenting on post:', error);
    res.status(500).json({ error: 'Server error commenting on post.' });
  }
});

// Report a post
router.post('/posts/:id/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    
    const userId = req.user.id;
    // Check if user already reported
    const alreadyReported = post.reports.some(r => r.userId.toString() === userId.toString());
    if (alreadyReported) {
      return res.status(400).json({ error: 'You have already reported this post.' });
    }
    
    post.reports.push({
      userId,
      reason: reason || 'Inappropriate content'
    });
    await post.save();
    
    // Simulate sending email to reporter
    const reporter = await User.findById(userId);
    if (reporter) {
      console.log(`[EMAIL SIMULATION] To: ${reporter.email}`);
      console.log(`Subject: Report Recorded`);
      console.log(`Body: Thank you for your report. Your report regarding the post has been recorded and is under admin review.`);
    }
    
    res.status(200).json({ message: 'Report recorded successfully.' });
  } catch (error) {
    console.error('Error reporting post:', error);
    res.status(500).json({ error: 'Server error reporting post.' });
  }
});

// Admin moderate post (remove or ignore)
router.post('/posts/:id/moderate', auth, async (req, res) => {
  try {
    // Check if admin
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }

    const { action } = req.body; // 'remove' or 'ignore'
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (action === 'remove') {
      post.isRemoved = true;
      await post.save();

      // Increment poster's violation count
      const poster = await User.findById(post.userId);
      if (poster) {
        poster.violationCount = (poster.violationCount || 0) + 1;
        
        // If violation > 3, suspend
        if (poster.violationCount > 3) {
          poster.role = 'suspended'; // or you can use isAvailable = false
          poster.isAvailable = false;
        }
        await poster.save();

        // Email poster
        console.log(`[EMAIL SIMULATION] To: ${poster.email}`);
        console.log(`Subject: Post Removed`);
        console.log(`Body: Your post has been taken down due to violation of community guidelines. Number of Violations: ${poster.violationCount}/3.`);
        if (poster.violationCount > 3) {
          console.log(`[EMAIL SIMULATION] To: ${poster.email} - Account Suspended.`);
        }
      }

      // Email reporters
      for (const report of post.reports) {
        const reporter = await User.findById(report.userId);
        if (reporter) {
          console.log(`[EMAIL SIMULATION] To: ${reporter.email}`);
          console.log(`Subject: Action Taken on Report`);
          console.log(`Body: Thank you for your report. The post you reported has been taken down due to violation of guidelines.`);
        }
      }

      return res.status(200).json({ message: 'Post removed successfully.' });
    } else if (action === 'ignore') {
      // Clear reports if ignored
      post.reports = [];
      await post.save();
      return res.status(200).json({ message: 'Report ignored.' });
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (error) {
    console.error('Error moderating post:', error);
    res.status(500).json({ error: 'Server error moderating post.' });
  }
});

// Admin get reported posts
router.get('/admin/posts', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }
    const posts = await Post.find({ 'reports.0': { $exists: true }, isRemoved: { $ne: true } })
      .sort({ 'reports.length': -1, createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({ error: 'Server error fetching admin posts.' });
  }
});

module.exports = router;
