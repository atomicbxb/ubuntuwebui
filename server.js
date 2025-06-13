const express = require('express');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

// Environment variables
const WEB_USERNAME = process.env.WEB_USERNAME || 'admin';
const WEB_PASSWORD = process.env.WEB_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.urlencoded({ extended: true }));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Create terminal process
    const term = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: '/root',
        env: {
            ...process.env,
            TERM: 'xterm-256color',
            HOME: '/root',
            USER: 'root',
            SHELL: '/bin/bash'
        }
    });

    // Send terminal data to client
    term.on('data', (data) => {
        socket.emit('terminal-output', data);
    });

    // Handle client input
    socket.on('terminal-input', (data) => {
        term.write(data);
    });

    // Handle terminal resize
    socket.on('terminal-resize', (data) => {
        term.resize(data.cols, data.rows);
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        term.kill();
    });
});

// Routes (tambahkan route yang hilang)
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
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0;
                }
                .login-container {
                    background: white;
                    padding: 2rem;
                    border-radius: 10px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    width: 100%;
                    max-width: 400px;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: bold;
                }
                input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 1rem;
                }
                button {
                    width: 100%;
                    padding: 0.75rem;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 1rem;
                    cursor: pointer;
                }
                button:hover {
                    background: #5a6fd8;
                }
                .error {
                    color: red;
                    margin-top: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h2>Ubuntu Web Terminal</h2>
                <form method="POST" action="/login">
                    <div class="form-group">
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit">Login</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === WEB_USERNAME && password === WEB_PASSWORD) {
        req.session.authenticated = true;
        res.redirect('/terminal');
    } else {
        res.redirect('/login?error=1');
    }
});

app.get('/terminal', requireAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ubuntu Web Terminal</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@4.19.0/css/xterm.css" />
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #1e1e1e;
                    font-family: monospace;
                    overflow: hidden;
                }
                .terminal-container {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .terminal-header {
                    background: #333;
                    color: white;
                    padding: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .terminal-content {
                    flex: 1;
                    padding: 10px;
                }
                #terminal {
                    height: 100%;
                }
                .btn {
                    padding: 5px 10px;
                    margin: 0 5px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                }
                .btn:hover {
                    background: #0056b3;
                }
                .btn-danger {
                    background: #dc3545;
                }
                .btn-danger:hover {
                    background: #c82333;
                }
            </style>
        </head>
        <body>
            <div class="terminal-container">
                <div class="terminal-header">
                    <h3>Ubuntu Web Terminal</h3>
                    <div>
                        <button class="btn" onclick="clearTerminal()">Clear</button>
                        <button class="btn btn-danger" onclick="logout()">Logout</button>
                    </div>
                </div>
                <div class="terminal-content">
                    <div id="terminal"></div>
                </div>
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
                        cursor: '#ffffff'
                    },
                    fontSize: 14,
                    fontFamily: 'Consolas, "Courier New", monospace'
                });
                
                const fitAddon = new FitAddon.FitAddon();
                terminal.loadAddon(fitAddon);
                
                terminal.open(document.getElementById('terminal'));
                fitAddon.fit();
                
                // Socket connection
                const socket = io({
                    transports: ['websocket', 'polling']
                });
                
                socket.on('connect', () => {
                    console.log('Connected to server');
                    // Send initial command to show we're connected
                    setTimeout(() => {
                        socket.emit('terminal-input', 'clear\\r');
                        socket.emit('terminal-input', 'echo "=== Ubuntu Web Terminal Ready ===" && echo "Current user: $(whoami)" && echo "Working directory: $(pwd)" && echo ""\\r');
                    }, 1000);
                });
                
                socket.on('terminal-output', (data) => {
                    terminal.write(data);
                });
                
                terminal.onData((data) => {
                    socket.emit('terminal-input', data);
                });
                
                terminal.onResize((size) => {
                    socket.emit('terminal-resize', size);
                });
                
                // Handle window resize
                window.addEventListener('resize', () => {
                    fitAddon.fit();
                });
                
                function clearTerminal() {
                    terminal.clear();
                    socket.emit('terminal-input', 'clear\\r');
                }
                
                function logout() {
                    window.location.href = '/logout';
                }
                
                // Initial fit
                setTimeout(() => {
                    fitAddon.fit();
                }, 100);
            </script>
        </body>
        </html>
    `);
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});

app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.redirect('/terminal');
    } else {
        res.redirect('/login');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ubuntu Web Terminal running on port ${PORT}`);
    console.log(`Login: http://localhost:${PORT}/login`);
    console.log(`Username: ${WEB_USERNAME}`);
    console.log(`Password: ${WEB_PASSWORD}`);
});