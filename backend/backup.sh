#!/bin/bash
# Legacy Ledger Daily Backup Script
# Requires pg_dump installed on the host environment
echo "Starting database backup..."
pg_dump $DATABASE_URL > backup_$(date +%F).sql
echo "Backup complete. Ready for S3 upload."