#!/bin/bash
# Run all intel scrapers
# Schedule this via cron for automation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Create output directory
mkdir -p output

# Run bidding spider
echo "Running bidding spider..."
python -m scrapy crawl bidding -o output/bids_$(date +%Y%m%d).json 2>&1 | tee -a output/bidding.log

# Run competitor spider
echo "Running competitor spider..."
python -m scrapy crawl competitor -o output/competitor_$(date +%Y%m%d).json 2>&1 | tee -a output/competitor.log

echo "All spiders complete."
