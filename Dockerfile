FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies termasuk build tools untuk node-pty
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
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Configure root user without password
RUN passwd -d root

# Create app directory
WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Install Node.js dependencies
RUN npm install

# Copy application files
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Start the application
CMD ["./start.sh"]