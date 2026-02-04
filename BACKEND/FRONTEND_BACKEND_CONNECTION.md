# Frontend-Backend Connection Guide

## Overview
Your application connects the frontend (HTML, CSS, JavaScript) with the backend (Node.js, Express, MongoDB) using **HTTP API requests** with the `fetch()` method.

---

## 📡 Architecture Diagram

```
Frontend (Browser)                Backend (Server)                Database
┌─────────────────────┐          ┌──────────────┐              ┌────────────┐
│  signuppage.html    │          │ Express.js   │              │ MongoDB    │
│  blog.html          │◄────────►│  server.js   │◄────────────►│  Atlas     │
│  *.js files         │  Fetch   │  API routes  │   Mongoose   │            │
│  *.css files        │          │              │              │            │
└─────────────────────┘          └──────────────┘              └────────────┘
     Port: Browser                Port: 3000                   Cloud Service
```

---

## 🌐 Base API URL Configuration

### In [2.js](signuppage&blog/2.js) and [blog.js](signuppage&blog/blog.js):

```javascript
// Detects if running locally or in production
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'                           // Local development
  : 'https://bloghub-1-bzwp.onrender.com';           // Production (Render)
```

**What this does:**
- ✅ **Localhost development**: Connects to `http://localhost:3000`
- ✅ **Production deployment**: Connects to `https://bloghub-1-bzwp.onrender.com`

---

## 📝 API ENDPOINTS & HOW THEY CONNECT

### 1️⃣ SIGNUP API ENDPOINT

**Frontend Request** ([2.js, lines 136-163](signuppage&blog/2.js#L136)):
```javascript
const userData = {
  name: name.value,
  email: email.value,
  password: password.value,
};

fetch(apiUrl + "/api/signup", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(userData),
})
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);
      alert("Account created!");
      showLoginForm();
    }
  })
```

**Backend Handler** ([server.js, lines 176-209](signuppage&blog/server.js#L176)):
```javascript
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to MongoDB
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: { name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});
```

**Data Flow:**
```
Frontend Form Input
       ↓
JavaScript validates data
       ↓
fetch() sends POST request to /api/signup
       ↓
Backend receives request (req.body)
       ↓
Check if email exists in MongoDB
       ↓
Hash password with bcryptjs
       ↓
Save user to MongoDB
       ↓
Send JSON response back
       ↓
Frontend receives response
       ↓
Store user info in localStorage
       ↓
Redirect to login page
```

---

### 2️⃣ LOGIN API ENDPOINT

**Frontend Request** ([2.js, lines 177-205](signuppage&blog/2.js#L177)):
```javascript
const loginData = {
  email: email.value,
  password: password.value
};

fetch(apiUrl + "/api/login", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(loginData),
})
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);
      alert("Login successful!");
      showBlogForm(data.user.name);
    }
  })
```

**Backend Handler** ([server.js, lines 211-245](signuppage&blog/server.js#L211)):
```javascript
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Compare password with hashed version
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
      user: { name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});
```

**Data Flow:**
```
Frontend Login Form
       ↓
Fetch POST to /api/login
       ↓
Backend finds user by email in MongoDB
       ↓
Compare entered password with stored (hashed) password
       ↓
If match, send user details back
       ↓
Frontend stores data in localStorage
       ↓
Redirect to blog page
```

---

### 3️⃣ CREATE BLOG POST ENDPOINT

**Frontend Request** ([blog.js, lines 180-220](signuppage&blog/blog.js#L180)):
```javascript
const blogData = {
  title: title,
  content: content,
  excerpt: excerpt,
  category: category,
  tags: tags,
  author: {
    name: userName,
    email: userEmail
  },
  requestId: requestId
};

console.log('📤 Sending blog to server:', blogData);

fetch(`${API_URL}/api/blogs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-request-id': requestId
  },
  body: JSON.stringify(blogData),
})
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      showToast('✅ Blog published successfully!');
      resetForm();
      loadAllBlogs();
    } else {
      showToast('❌ Error: ' + data.message);
    }
  })
  .catch((error) => {
    console.error('❌ Network error:', error);
    showToast('❌ Connection error');
  })
```

**Backend Handler** ([server.js, lines 273-330](signuppage&blog/server.js#L273)):
```javascript
app.post('/api/blogs', async (req, res) => {
  try {
    const requestId = req.get('x-request-id') || req.body.requestId;
    const { title, content, excerpt, author, tags, category } = req.body;

    // Validate required fields
    if (!title || !content || !excerpt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!author || !author.email) {
      return res.status(400).json({
        success: false,
        message: 'Missing user info'
      });
    }

    // Create blog post
    const newBlog = new Blog({
      title,
      category,
      content,
      excerpt,
      requestId,
      author,
      tags
    });

    await newBlog.save();

    res.status(201).json({
      success: true,
      message: 'Blog published successfully!',
      blog: newBlog
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating blog' 
    });
  }
});
```

**Data Flow:**
```
Blog Form Submission
       ↓
Validate form fields (title, content, etc.)
       ↓
Get user info from localStorage
       ↓
Fetch POST to /api/blogs
       ↓
Backend receives blog data
       ↓
Validate all required fields
       ↓
Create new Blog document
       ↓
Save to MongoDB
       ↓
Send success response
       ↓
Frontend shows toast message
       ↓
Reload blog list
```

---

### 4️⃣ GET ALL BLOGS ENDPOINT

**Frontend Request** ([blog.js, lines 260-280](signuppage&blog/blog.js#L260)):
```javascript
async function loadAllBlogs() {
  try {
    const response = await fetch(`${API_URL}/api/blogs`);
    const data = await response.json();

    if (data.success) {
      const blogs = data.blogs || [];
      displayBlogs(blogs);
    }
  } catch (error) {
    console.error('Error loading blogs:', error);
  }
}
```

**Backend Handler** ([server.js, lines 342-360](signuppage&blog/server.js#L342)):
```javascript
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: blogs.length,
      blogs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching blogs' 
    });
  }
});
```

---

## 💾 localStorage - Client-Side Data Storage

Your app uses **localStorage** to temporarily store user information:

### Storing Data (After signup/login):
```javascript
localStorage.setItem("userName", data.user.name);
localStorage.setItem("userEmail", data.user.email);
```

### Retrieving Data (When loading blog page):
```javascript
const userName = localStorage.getItem('userName');
const userEmail = localStorage.getItem('userEmail');
```

### Clearing Data (On logout):
```javascript
localStorage.removeItem("userName");
localStorage.removeItem("userEmail");
```

---

## 🔐 Security Features

### 1. **Password Hashing (bcryptjs)**
- Frontend sends plain password
- Backend hashes it: `bcrypt.hash(password, 10)`
- Never stored in plain text
- Verified on login: `bcrypt.compare(password, hashedPassword)`

### 2. **CORS (Cross-Origin Resource Sharing)**
```javascript
// server.js - Allow requests from frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

### 3. **Request Validation**
- Frontend validates data before sending
- Backend validates again to prevent bad data

### 4. **Request ID for Duplicate Prevention**
```javascript
// Prevents accidental double-posting
const requestId = generateRequestId();
// ... sent with request to backend
```

---

## 🚀 How to Run Locally

### Step 1: Start MongoDB
```powershell
mongod
```
Keep this window open.

### Step 2: Start Backend Server
```powershell
cd "signuppage&blog"
npm install
npm start
```
Server runs on `http://localhost:3000`

### Step 3: Open Frontend
```
http://localhost:3000/signuppage.html
```

---

## 📊 Complete Data Flow Summary

```
USER SIGNUP/LOGIN
├── Frontend: User fills form
├── JavaScript validates input
├── Fetch sends POST to /api/signup or /api/login
├── Backend receives request
├── Check/create user in MongoDB
├── Send back user data + success status
├── Frontend stores in localStorage
└── Redirect to blog page

CREATE BLOG POST
├── Frontend: User writes blog
├── Submit form
├── Fetch sends POST to /api/blogs
├── Backend saves blog to MongoDB
├── Send success response
├── Frontend shows confirmation
└── Load and display all blogs

GET BLOG POSTS
├── Frontend requests all blogs
├── Backend retrieves from MongoDB
├── Send back blog list
├── Frontend displays blogs
└── User can read/like/comment
```

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| [signuppage.html](signuppage&blog/signuppage.html) | HTML structure for signup/login |
| [2.js](signuppage&blog/2.js) | Frontend logic for signup/login |
| [blog.html](signuppage&blog/blog.html) | HTML structure for blog page |
| [blog.js](signuppage&blog/blog.js) | Frontend logic for blog management |
| [server.js](signuppage&blog/server.js) | Backend API endpoints |
| [3.css](signuppage&blog/3.css) | Styling |
| [blog.css](signuppage&blog/blog.css) | Blog page styling |

---

## ✅ Connection Checklist

- ✅ Backend API URL correctly configured for dev/production
- ✅ Fetch requests with correct HTTP methods (POST, GET, PUT, DELETE)
- ✅ JSON request/response headers
- ✅ Error handling on both frontend and backend
- ✅ CORS enabled for cross-origin requests
- ✅ MongoDB connected and storing data
- ✅ localStorage for session management
- ✅ Password security with bcryptjs

Your app is a complete full-stack solution! 🎉
