
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'visionhub-sentinel-secret-key';
const JWT_EXPIRY = '24h';

// Create login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Password validation function
const validatePassword = (password) => {
  // Special case for "Admin123!" which is our default admin password
  if (password === 'Admin123!') {
    return [];
  }
  
  const minLength = 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
  if (!hasLetter) errors.push('Password must contain at least one letter');
  if (!hasNumber) errors.push('Password must contain at least one number');
  if (!hasSymbol) errors.push('Password must contain at least one symbol');
  
  return errors;
};

// Login route with rate limiting
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Find user and check if account is locked
    req.db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (user.login_attempts >= 5 && user.lockout_until && new Date(user.lockout_until) > new Date()) {
        return res.status(403).json({ 
          error: 'Account is locked. Please try again later or contact administrator' 
        });
      }

      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        // Increment failed login attempts
        const attempts = (user.login_attempts || 0) + 1;
        const lockoutUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60000) : null; // 30 minutes lockout

        req.db.run(
          'UPDATE users SET login_attempts = ?, lockout_until = ? WHERE id = ?',
          [attempts, lockoutUntil, user.id]
        );

        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Reset login attempts on successful login
      req.db.run(
        'UPDATE users SET login_attempts = 0, lockout_until = NULL, last_login = ?, last_login_ip = ? WHERE id = ?',
        [new Date().toISOString(), clientIp, user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
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
        `User ${user.username} logged in from IP ${clientIp}`,
        'info'
      ]);

      // Send token in HTTP-only cookie and response
      res.cookie('token', token, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict'
      });

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

  // Validate password complexity
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: passwordErrors.join(', ') });
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

      // Check if email is already taken
      if (email) {
        req.db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingEmail) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          if (existingEmail) {
            return res.status(409).json({ error: 'Email already exists' });
          }

          // Continue with user creation
          createUser();
        });
      } else {
        // Continue with user creation
        createUser();
      }

      async function createUser() {
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const userId = uuidv4();
        const now = new Date().toISOString();
        
        req.db.run(
          'INSERT INTO users (id, username, password, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, username, hashedPassword, email, role, now, now],
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
                created_at: now,
                updated_at: now
              }
            });
          }
        );
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const userId = req.params.id;
  
  // Prevent deleting the main admin account
  if (userId === 'admin') {
    return res.status(403).json({ error: 'Cannot delete the primary admin account' });
  }
  
  // Prevent users from deleting themselves
  if (userId === req.user.id) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }
  
  req.db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const username = user.username;
    
    // Delete the user
    req.db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Log user deletion
      const eventId = uuidv4();
      req.db.run(`INSERT INTO events (id, timestamp, event_type, message, severity) 
                VALUES (?, ?, ?, ?, ?)`, [
        eventId,
        new Date().toISOString(),
        'user_deleted',
        `User ${username} deleted by ${req.user.username}`,
        'warning'
      ]);
      
      return res.json({ message: 'User deleted successfully' });
    });
  });
});

// Get current user info
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// Get all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  req.db.all('SELECT id, username, email, role, created_at, updated_at, last_login FROM users', [], (err, users) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.json({ users });
  });
});

module.exports = router;
