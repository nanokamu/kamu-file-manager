# Using Java 25 (LTS) on Debian Bookworm
# Source: https://mcr.microsoft.com/en-us/artifact/mar/devcontainers/java/tag/dev-25-jdk-bookworm
FROM mcr.microsoft.com/devcontainers/java:dev-25-jdk-bookworm@sha256:05df699ea8fce0da832951c354a9e2316c9161eed304d66adc6aaa6af0e10575

# Installs Maven (Apache Maven 3.8.7)
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends maven

# Installs Python 3.11
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Installs Essential compilation tools for node-gyp
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Installs Node.js 24 (LTS) directly via NodeSource
# RUN mkdir -p /etc/apt/keyrings \
#     && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
#     && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
#     && apt-get update && apt-get install -y nodejs \
#     && rm -rf /var/lib/apt/lists/*

# Installs Python required libraries
# RUN pip3 install --no-cache-dir --break-system-packages \
#     requests \
#     numpy \
#     pandas \
#     jupyter \
#     notebook \
#     sqlalchemy \
#     psycopg2-binary \
#     pyarrow \
#     && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container temporary folder
COPY .devcontainer/requirements.txt /tmp/pip-tmp/

# Install the libraries and clean up the temporary file
RUN pip3 --no-cache-dir install --break-system-packages -r /tmp/pip-tmp/requirements.txt \
    && rm -rf /tmp/pip-tmp