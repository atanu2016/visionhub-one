
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'visionhub-sentinel-secret-key';
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Find user in database
    req.db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      req.db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      // Log successful login
      const eventId = uuidv4();
      req.db.run(`INSERT INTO events (id, timestamp, event_type, message, severity) 
                VALUES (?, ?, ?, ?, ?)`, [
        eventId,
        new Date().toISOString(),
        'user_login',
        `User ${user.username} logged in`,
        'info'
      ]);

      // Send token in HTTP-only cookie and response
      res.cookie('token', token, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });

      // Return user info (without password)
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ 
        user: userWithoutPassword,
        token,
        message: 'Login successful' 
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logout successful' });
});

// Register new user (admin only)
router.post('/register', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, password, email, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Check if username is already taken
    req.db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existingUser) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user
      const userId = uuidv4();
      req.db.run(
        'INSERT INTO users (id, username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, email, role, new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          // Log user creation
          const eventId = uuidv4();
          req.db.run(`INSERT INTO events (id, timestamp, event_type, message, severity) 
                    VALUES (?, ?, ?, ?, ?)`, [
            eventId,
            new Date().toISOString(),
            'user_created',
            `User ${username} created by ${req.user.username}`,
            'info'
          ]);

          return res.status(201).json({
            message: 'User registered successfully',
            user: {
              id: userId,
              username,
              email,
              role,
              created_at: new Date().toISOString()
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// Get all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  req.db.all('SELECT id, username, email, role, created_at, last_login FROM users', [], (err, users) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.json({ users });
  });
});

module.exports = router;
