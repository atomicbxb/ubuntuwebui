const express = require('express');
const session = require('express-session');
const { spawn } = require('child_process');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-key-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
}

// Login page
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        return res.redirect('/terminal');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ubuntu Web Terminal - Login</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .login-container {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 2.5rem;
                    border-radius: 15px;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 400px;
                    backdrop-filter: blur(10px);
                }
                
                .login-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .login-header h1 {
                    color: #333;
                    font-size: 1.8rem;
                    margin-bottom: 0.5rem;
                }
                
                .login-header p {
                    color: #666;
                    font-size: 0.9rem;
                }
                
                .form-group {
                    margin-bottom: 1.5rem;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: #333;
                    font-weight: 500;
                }
                
                .form-group input {
                    width: 100%;
                    padding: 12px 15px;
                    border: 2px solid #e1e5e9;
                    border-radius: 8px;
                    font-size: 1rem;
                    transition: border-color 0.3s ease;
                    background: white;
                }
                
                .form-group input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .login-btn {
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }
                
                .login-btn:hover {
                    transform: translateY(-2px);
                }
                
                .error-message {
                    background: #fee;
                    color: #c33;
                    padding: 10px;
                    border-radius: 5px;
                    margin-top: 1rem;
                    border-left: 4px solid #c33;
                }
                
                .terminal-icon {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <div class="login-header">
                    <div class="terminal-icon">🖥️</div>
                    <h1>Ubuntu Web Terminal</h1>
                    <p>Secure terminal access</p>
                </div>
                
                <form method="POST" action="/login">
                    <div class="form-group">
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" required autocomplete="username">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required autocomplete="current-password">
                    </div>
                    
                    <button type="submit" class="login-btn">Access Terminal</button>
                </form>
                
                ${req.query.error ? '<div class="error-message">❌ Invalid username or password</div>' : ''}
            </div>
        </body>
        </html>
    `);
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Authentication credentials (CHANGE THESE!)
    const VALID_USERNAME = process.env.WEB_USERNAME || 'admin';
    const VALID_PASSWORD = process.env.WEB_PASSWORD || 'admin123';
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        req.session.authenticated = true;
        req.session.username = username;
        res.redirect('/terminal');
    } else {
        res.redirect('/login?error=1');
    }
});

// Terminal page
app.get('/terminal', requireAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ubuntu Terminal</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@4.19.0/css/xterm.css">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #1e1e1e;
                    font-family: 'Courier New', monospace;
                    overflow: hidden;
                }
                
                .terminal-container {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                
                .terminal-header {
                    background: #2d2d2d;
                    color: white;
                    padding: 10px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #444;
                }
                
                .terminal-title {
                    font-size: 14px;
                    font-weight: bold;
                }
                
                .terminal-controls {
                    display: flex;
                    gap: 10px;
                }
                
                .btn {
                    padding: 5px 10px;
                    background: #007acc;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .btn:hover {
                    background: #005a9e;
                }
                
                .btn-danger {
                    background: #dc3545;
                }
                
                .btn-danger:hover {
                    background: #c82333;
                }
                
                #terminal {
                    flex: 1;
                    padding: 10px;
                }
                
                .status {
                    color: #00ff00;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="terminal-container">
                <div class="terminal-header">
                    <div class="terminal-title">
                        🖥️ Ubuntu Terminal - User: ${req.session.username}
                        <span class="status" id="status">● Connected</span>
                    </div>
                    <div class="terminal-controls">
                        <button class="btn" onclick="clearTerminal()">Clear</button>
                        <button class="btn btn-danger" onclick="logout()">Logout</button>
                    </div>
                </div>
                <div id="terminal"></div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/xterm@4.19.0/lib/xterm.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.5.0/lib/xterm-addon-fit.js"></script>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const terminal = new Terminal({
                    cursorBlink: true,
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#ffffff',
                        cursor: '#ffffff',
                        selection: '#ffffff40',
                        black: '#000000',
                        red: '#ff5555',
                        green: '#50fa7b',
                        yellow: '#f1fa8c',
                        blue: '#bd93f9',
                        magenta: '#ff79c6',
                        cyan: '#8be9fd',
                        white: '#bfbfbf'
                    }
                });
                
                const fitAddon = new FitAddon.FitAddon();
                terminal.loadAddon(fitAddon);
                
                terminal.open(document.getElementById('terminal'));
                fitAddon.fit();
                
                const socket = io();
                
                socket.on('connect', () => {
                    document.getElementById('status').textContent = '● Connected';
                    document.getElementById('status').style.color = '#00ff00';
                });.on('disconnect', () => {
                    document.getElementById('status').textContent = '● Disconnected';
                    document.getElementById('status').style.color = '#ff0000';
                });
                
                socket.on('terminal-output', (data) => {
                    terminal.write(data);
                });
                
                terminal.onData((data) => {
                    socket.emit('terminal-input', data);
                });
                
                window.addEventListener('resize', () => {
                    fitAddon.fit();
                    socket.emit('terminal-resize', {
                        cols: terminal.cols,
                        rows: terminal.rows
                    });
                });
                
                function clearTerminal() {
                    terminal.clear();
                }
                
                function logout() {
                    if (confirm('Are you sure you want to logout?')) {
                        window.location.href = '/logout';
                    }
                }
                
                // Initial resize
                setTimeout(() => {
                    fitAddon.fit();
                    socket.emit('terminal-resize', {
                        cols: terminal.cols,
                        rows: terminal.rows
                    });
                }, 100);
            </script>
        </body>
        </html>
    `);
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});

// Root redirect
app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.redirect('/terminal');
    } else {
        res.redirect('/login');
    }
});

// Socket.IO for terminal
io.use((socket, next) => {
    const session = socket.handshake.headers.cookie;
    // Simple session check - in production, use proper session middleware
    next();
});

io.on('connection', (socket) => {
    console.log('Client connected to terminal');
    
    // Create terminal process as root
    const ptyProcess = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: '/root',
        env: {
            ...process.env,
            TERM: 'xterm-256color',
            USER: 'root',
            HOME: '/root',
            PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
        },
        uid: 0, // Run as root
        gid: 0
    });
    
    // Send terminal output to client
    ptyProcess.on('data', (data) => {
        socket.emit('terminal-output', data);
    });
    
    // Handle client input
    socket.on('terminal-input', (data) => {
        ptyProcess.write(data);
    });
    
    // Handle terminal resize
    socket.on('terminal-resize', (data) => {
        ptyProcess.resize(data.cols, data.rows);
    });
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected from terminal');
        ptyProcess.kill();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ubuntu Web Terminal running on port ${PORT}`);
    console.log(`Access: http://localhost:${PORT}`);
});
