#!/bin/bash

# Use environment variable if set, otherwise fallback to the new relative path
DB_FILE=${VMS_DB_PATH:-"../app/vms.db"}

#create a DB File if it doesn't exist and set permissions
touch "$DB_FILE"
chmod 666 "$DB_FILE"

# Run migrations
echo "Running database migrations..."
python migrate.py

# Start the application
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
