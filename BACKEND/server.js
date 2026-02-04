
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS enabled for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Simple health check (useful for Render verification)
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'bloghub', time: new Date().toISOString() });
});

// Test endpoint to check database state
app.get('/api/debug/blogs', async (req, res) => {
  try {
    const allBlogs = await Blog.find({}).select('title status author createdAt');
    const approved = await Blog.countDocuments({ status: 'approved' });
    const pending = await Blog.countDocuments({ status: 'pending' });
    const rejected = await Blog.countDocuments({ status: 'rejected' });
    
    res.json({
      total: allBlogs.length,
      approved,
      pending,
      rejected,
      blogs: allBlogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Explicit asset routes (prevents MIME/404 issues when paths are requested directly)
app.get('/blog.css', (req, res) => {
  res.type('text/css');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(__dirname, 'blog.css'));
});

app.get('/blog.js', (req, res) => {
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(__dirname, 'blog.js'));
});

// Serve static assets early so CSS/JS requests don't fall through to HTML/404 responses
const STATIC_ROOT = __dirname;
app.use(express.static(STATIC_ROOT, {
  fallthrough: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }
}));

// IMPORTANT: Serve static files LAST, after all API routes
// This prevents static files from being caught by other middleware

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://karthikeya:BlogHub2026@cluster0.qb4ufyz.mongodb.net/bloghub?retryWrites=true&w=majority';

// IMPORTANT: If you get connection error, use MongoDB Atlas instead:
// 1. Go to https://www.mongodb.com/cloud/atlas/register
// 2. Create free account and cluster
// 3. Get connection string and replace above

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('\n⚠️  MongoDB is not running!');
  console.log('📌 Quick fixes:');
  console.log('   1. Install MongoDB from: https://www.mongodb.com/try/download/community');
  console.log('   2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas');
  console.log('   3. Update connection string in server.js\n');
});

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Blog Schema
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true
  },
  requestId: {
    type: String,
    unique: true,
    sparse: true
  },
  signature: {
    type: String,
    index: true
  },
  author: {
    name: String,
    email: String
  },
  tags: [String],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedAt: {
    type: Date,
    default: null
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

blogSchema.index({ requestId: 1 }, { unique: true, sparse: true });
blogSchema.index({ signature: 1, createdAt: -1 });

function computeBlogSignature({ title, content, excerpt, category, tags, authorEmail }) {
  const normalized = {
    title: (title || '').trim(),
    content: (content || '').trim(),
    excerpt: (excerpt || '').trim(),
    category: (category || '').trim(),
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean).sort() : [],
    authorEmail: (authorEmail || '').trim().toLowerCase()
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

const User = mongoose.model('User', userSchema);
const Blog = mongoose.model('Blog', blogSchema);

// ==================== USER ROUTES ====================

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating account' 
    });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login' 
    });
  }
});

// ============ ADMIN ROUTES ============
// Admin middleware to check API key
function requireAdmin(req, res, next) {
  const apiKey = req.get('x-admin-key');
  const expectedKey = process.env.ADMIN_API_KEY || 'your_secret_admin_key_here_123';
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Invalid admin key' 
    });
  }
  next();
}

// Get notifications count for admin
app.get('/api/notifications', requireAdmin, async (req, res) => {
  try {
    const pendingBlogs = await Blog.countDocuments({ status: 'pending' });
    const pendingUsers = await User.countDocuments({ approved: false });
    
    res.json({
      success: true,
      pendingBlogs,
      pendingUsers,
      total: pendingBlogs + pendingUsers
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Get pending blogs for admin
app.get('/api/admin/blogs/pending', requireAdmin, async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, count: blogs.length, blogs });
  } catch (error) {
    console.error('Admin get pending blogs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending blogs' });
  }
});

// Approve blog
app.post('/api/admin/blogs/:id/approve', requireAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.json({ success: true, message: 'Blog approved and published!', blog });
  } catch (error) {
    console.error('Admin approve blog error:', error);
    res.status(500).json({ success: false, message: 'Error approving blog' });
  }
});

// Reject blog
app.post('/api/admin/blogs/:id/reject', requireAdmin, async (req, res) => {
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

// Get pending users for admin
app.get('/api/admin/users/pending', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ approved: false }, '-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Admin get pending users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending users' });
  }
});

// Approve user
app.post('/api/admin/users/:id/approve', requireAdmin, async (req, res) => {
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

// Reject user
app.post('/api/admin/users/:id/reject', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { approved: false, approvedAt: null },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User rejected', user });
  } catch (error) {
    console.error('Admin reject user error:', error);
    res.status(500).json({ success: false, message: 'Error rejecting user' });
  }
});

// Get all users (for admin purposes)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude password
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// ==================== BLOG ROUTES ====================

// Create Blog Post
app.post('/api/blogs', async (req, res) => {
  try {
    const requestId = req.get('x-request-id') || req.body.requestId;
    const { title, content, excerpt, author, tags, category } = req.body;

    if (!title || !content || !excerpt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!author || !author.email) {
      return res.status(400).json({
        success: false,
        message: 'Missing user info (author.email). Please login again.'
      });
    }

    // Content dedupe window (handles cases where multiple requests are sent with DIFFERENT requestIds)
    const signature = computeBlogSignature({
      title,
      content,
      excerpt,
      category,
      tags,
      authorEmail: author?.email
    });

    // Only dedupe near-simultaneous double submits (e.g. double click / retries)
    const dedupeSince = new Date(Date.now() - 2000);
    const recentDuplicate = await Blog.findOne({ signature, createdAt: { $gte: dedupeSince } });
    if (recentDuplicate) {
      return res.status(200).json({
        success: true,
        deduped: true,
        message: 'Duplicate submission ignored (already saved)',
        blog: recentDuplicate
      });
    }

    // Idempotency: if the client sends a requestId, duplicate POSTs will map to the same document.
    if (requestId) {
      const blog = await Blog.findOneAndUpdate(
        { requestId },
        {
          $setOnInsert: {
            requestId,
            signature,
            title,
            content,
            excerpt,
            category,
            author,
            tags: tags || [],
            status: 'pending'  // Always start as pending
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(201).json({
        success: true,
        deduped: false,
        message: 'Blog submitted for admin approval!',
        blog
      });
    }

    // Fallback dedupe (no requestId): avoid creating two identical posts within 2 seconds.
    const since = new Date(Date.now() - 2000);
    const existing = await Blog.findOne({
      title,
      content,
      excerpt,
      'author.email': author?.email,
      createdAt: { $gte: since }
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        deduped: true,
        message: 'Duplicate submission ignored (already saved)',
        blog: existing
      });
    }

    const newBlog = new Blog({
      title,
      content,
      excerpt,
      category,
      signature,
      author,
      tags: tags || [],
      status: 'pending'  // Always start as pending, requires admin approval
    });

    await newBlog.save();

    return res.status(201).json({
      success: true,
      deduped: false,
      message: 'Blog submitted for admin approval!',
      blog: newBlog
    });
  } catch (error) {
    // If a duplicate requestId is inserted concurrently, return the existing blog.
    if (error && error.code === 11000) {
      const requestId = req.get('x-request-id') || req.body.requestId;
      if (requestId) {
        const existing = await Blog.findOne({ requestId });
        if (existing) {
          return res.status(200).json({
            success: true,
            deduped: true,
            message: 'Duplicate submission ignored (already saved)',
            blog: existing
          });
        }
      }
    }
    console.error('Create blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating blog post' 
    });
  }
});

// Get all blogs
app.get('/api/blogs', async (req, res) => {
  try {
    const userEmail = req.query.userEmail;
    let query;
    
    // If userEmail provided, show approved blogs + user's own blogs (any status)
    if (userEmail) {
      query = {
        $or: [
          { status: 'approved' },
          { 'author.email': userEmail.toLowerCase() }
        ]
      };
    } else {
      // Public view: only approved blogs
      query = { status: 'approved' };
    }
    
    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: blogs.length,
      blogs
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching blogs' 
    });
  }
});

// Get single blog
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }
    res.json({
      success: true,
      blog
    });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching blog' 
    });
  }
});

// Update blog
app.put('/api/blogs/:id', async (req, res) => {
  try {
    const { title, content, excerpt, tags } = req.body;
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content, excerpt, tags },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully!',
      blog: updatedBlog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating blog' 
    });
  }
});

// Delete blog
app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!deletedBlog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully!'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting blog' 
    });
  }
});

// Like a blog
app.post('/api/blogs/:id/like', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    res.json({
      success: true,
      likes: blog.likes
    });
  } catch (error) {
    console.error('Like blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error liking blog' 
    });
  }
});

// Catch-all route for single page app - serve blog.html or signuppage.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'signuppage.html'));
});

app.get('/blog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog.html'));
});

app.get('/signuppage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signuppage.html'));
});

// Final fallback: avoid Express default HTML 404 (prevents MIME-type confusion in browsers)
app.use((req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📄 Visit http://localhost:${PORT}/signuppage.html`);
});
