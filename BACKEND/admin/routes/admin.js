const express = require('express');

module.exports = function createAdminRouter({ User, Blog, requireAdmin }) {
  const router = express.Router();

  // All admin routes require admin key
  router.use(requireAdmin);

  // Users
  router.get('/users', async (req, res) => {
    try {
      const users = await User.find({}, '-password').sort({ createdAt: -1 });
      res.json({ success: true, count: users.length, users });
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ success: false, message: 'Error fetching users' });
    }
  });

  router.get('/users/pending', async (req, res) => {
    try {
      const users = await User.find({ approved: false }, '-password').sort({ createdAt: -1 });
      res.json({ success: true, count: users.length, users });
    } catch (error) {
      console.error('Admin get pending users error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending users' });
    }
  });

  router.post('/users/:id/approve', async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { approved: true, approvedAt: new Date() },
        { new: true, select: '-password' }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, message: 'User approved', user });
    } catch (error) {
      console.error('Admin approve user error:', error);
      res.status(500).json({ success: false, message: 'Error approving user' });
    }
  });

  router.post('/users/:id/reject', async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { approved: false, approvedAt: null },
        { new: true, select: '-password' }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, message: 'User marked as not approved', user });
    } catch (error) {
      console.error('Admin reject user error:', error);
      res.status(500).json({ success: false, message: 'Error rejecting user' });
    }
  });

  // Blogs
  router.get('/blogs', async (req, res) => {
    try {
      const blogs = await Blog.find().sort({ createdAt: -1 });
      res.json({ success: true, count: blogs.length, blogs });
    } catch (error) {
      console.error('Admin get blogs error:', error);
      res.status(500).json({ success: false, message: 'Error fetching blogs' });
    }
  });

  router.get('/blogs/pending', async (req, res) => {
    try {
      const blogs = await Blog.find({ status: 'pending' }).sort({ createdAt: -1 });
      res.json({ success: true, count: blogs.length, blogs });
    } catch (error) {
      console.error('Admin get pending blogs error:', error);
      res.status(500).json({ success: false, message: 'Error fetching pending blogs' });
    }
  });

  router.post('/blogs/:id/approve', async (req, res) => {
    try {
      const blog = await Blog.findByIdAndUpdate(
        req.params.id,
        { status: 'approved', approvedAt: new Date() },
        { new: true }
      );

      if (!blog) {
        return res.status(404).json({ success: false, message: 'Blog not found' });
      }

      res.json({ success: true, message: 'Blog approved', blog });
    } catch (error) {
      console.error('Admin approve blog error:', error);
      res.status(500).json({ success: false, message: 'Error approving blog' });
    }
  });

  router.post('/blogs/:id/reject', async (req, res) => {
    try {
      const blog = await Blog.findByIdAndUpdate(
        req.params.id,
        { status: 'rejected', approvedAt: null },
        { new: true }
      );

      if (!blog) {
        return res.status(404).json({ success: false, message: 'Blog not found' });
      }

      res.json({ success: true, message: 'Blog rejected', blog });
    } catch (error) {
      console.error('Admin reject blog error:', error);
      res.status(500).json({ success: false, message: 'Error rejecting blog' });
    }
  });

  return router;
};
