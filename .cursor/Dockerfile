FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install common development tools and runtimes
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git curl ca-certificates build-essential \
        python3 python3-pip python3-venv libpq-dev && \
    # Install Node.js 20 LTS from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create a non-root user and switch to it
RUN useradd -ms /bin/bash ubuntu
USER ubuntu
WORKDIR /home/ubuntu

# Default shell
CMD ["bash"]
