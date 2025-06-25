#!/bin/bash

# Setup script for daily grants update cron job
# Run this script to install the daily update job

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$BACKEND_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Create the cron runner script
cat > "$SCRIPT_DIR/run_daily_update.sh" << 'EOF'
#!/bin/bash

# Daily grants update runner script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$BACKEND_DIR/logs/cron_$(date +%Y%m%d_%H%M%S).log"

echo "Starting daily grants update at $(date)" >> "$LOG_FILE"

# Load NVM if available (for Node.js)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Change to backend directory
cd "$BACKEND_DIR"

# Run the update script
/usr/bin/env node -r ts-node/register "$SCRIPT_DIR/daily_grants_update.ts" >> "$LOG_FILE" 2>&1

# Check exit code
if [ $? -eq 0 ]; then
    echo "Update completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "Update failed with errors at $(date)" >> "$LOG_FILE"
    
    # Optional: Send alert email (configure with your email)
    # echo "Grant update failed. Check logs at $LOG_FILE" | mail -s "Grant Update Failure" admin@example.com
fi

# Rotate logs - keep only last 30 days
find "$BACKEND_DIR/logs" -name "cron_*.log" -mtime +30 -delete
find "$BACKEND_DIR/logs" -name "update_*.json" -mtime +30 -delete
EOF

# Make the runner script executable
chmod +x "$SCRIPT_DIR/run_daily_update.sh"

echo "🔧 Setting up daily grants update cron job..."
echo ""
echo "Choose your schedule:"
echo "1) Every day at 2:00 AM (recommended)"
echo "2) Every day at 6:00 AM"
echo "3) Every 12 hours (2:00 AM and 2:00 PM)"
echo "4) Custom schedule"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        ;;
    2)
        CRON_SCHEDULE="0 6 * * *"
        ;;
    3)
        CRON_SCHEDULE="0 2,14 * * *"
        ;;
    4)
        echo "Enter custom cron schedule (e.g., '0 3 * * *' for 3:00 AM daily):"
        read CRON_SCHEDULE
        ;;
    *)
        echo "Invalid choice. Using default (2:00 AM daily)"
        CRON_SCHEDULE="0 2 * * *"
        ;;
esac

# Add to crontab
CRON_CMD="$CRON_SCHEDULE $SCRIPT_DIR/run_daily_update.sh"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "run_daily_update.sh"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove old entry
    crontab -l | grep -v "run_daily_update.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo ""
echo "✅ Daily grants update cron job installed!"
echo ""
echo "📅 Schedule: $CRON_SCHEDULE"
echo "📁 Logs will be saved to: $LOG_DIR"
echo "🔧 Runner script: $SCRIPT_DIR/run_daily_update.sh"
echo ""
echo "To test the update manually, run:"
echo "  cd $BACKEND_DIR && npm run update:grants"
echo ""
echo "To view the cron job, run:"
echo "  crontab -l"
echo ""
echo "To remove the cron job, run:"
echo "  crontab -l | grep -v 'run_daily_update.sh' | crontab -"