#!/bin/bash

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            echo "debian"
        elif [ -f /etc/redhat-release ]; then
            echo "redhat"
        else
            echo "linux"
        fi
    else
        echo "unknown"
    fi
}

# Function to install on macOS
install_macos() {
    echo "Installing dependencies for macOS..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    # Install PostgreSQL if not installed
    if ! command -v psql &> /dev/null; then
        echo "Installing PostgreSQL..."
        brew install postgresql@14
        brew services start postgresql@14
    fi

    # Install Supabase CLI if not installed
    if ! command -v supabase &> /dev/null; then
        echo "Installing Supabase CLI..."
        brew install supabase/tap/supabase
    fi
}

# Function to install on Debian/Ubuntu
install_debian() {
    echo "Installing dependencies for Debian/Ubuntu..."
    
    # Update package list
    sudo apt-get update

    # Install PostgreSQL if not installed
    if ! command -v psql &> /dev/null; then
        echo "Installing PostgreSQL..."
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi

    # Install Supabase CLI if not installed
    if ! command -v supabase &> /dev/null; then
        echo "Installing Supabase CLI..."
        curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
    fi
}

# Function to install on RedHat/Fedora
install_redhat() {
    echo "Installing dependencies for RedHat/Fedora..."
    
    # Install PostgreSQL if not installed
    if ! command -v psql &> /dev/null; then
        echo "Installing PostgreSQL..."
        sudo dnf install -y postgresql postgresql-server
        sudo postgresql-setup --initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi

    # Install Supabase CLI if not installed
    if ! command -v supabase &> /dev/null; then
        echo "Installing Supabase CLI..."
        curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
    fi
}

# Main installation logic
OS=$(detect_os)
case $OS in
    "macos")
        install_macos
        ;;
    "debian")
        install_debian
        ;;
    "redhat")
        install_redhat
        ;;
    *)
        echo "Unsupported operating system"
        exit 1
        ;;
esac

echo "Installation complete!"
echo "You may need to restart your terminal for changes to take effect." 