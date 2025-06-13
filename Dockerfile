FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    curl \
    wget \
    nano \
    vim \
    htop \
    git \
    sudo \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

# Install wetty and dependencies
RUN npm install -g wetty express express-session

# Configure root user without password
RUN passwd -d root

# Configure SSH (optional, for wetty SSH mode)
RUN mkdir /var/run/sshd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords yes/' /etc/ssh/sshd_config

# Create app directory
RUN mkdir -p /app

# Copy application files
COPY server.js /app/server.js
COPY package.json /app/package.json
COPY start.sh /app/start.sh

# Make start script executable
RUN chmod +x /app/start.sh

# Set working directory
WORKDIR /app

# Install Node.js dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start the application
CMD ["./start.sh"]
