#!/bin/bash

#create a DB File if it doesn't exist and set permissions
touch vms.db
chmod 666 vms.db

# Run migrations
echo "Running database migrations..."
python migrate.py

# Start the application
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
