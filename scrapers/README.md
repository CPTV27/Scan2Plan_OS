# Scan2Plan Intel Scrapers

Python-based web scrapers for automated intelligence gathering.

## Setup

```bash
cd scrapers
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Available Spiders

| Spider | Target | Output |
|--------|--------|--------|
| `bidding` | Bidding opportunity sites | New intel items |
| `competitor` | Competitor websites | Watch items |
| `policies` | Government portals | Policy updates |

## Running Spiders

```bash
# Run bidding spider
python -m scrapy crawl bidding -o output/bids.json

# Run competitor spider
python -m scrapy crawl competitor -o output/competitor.json

# Run all spiders via script
./run_all.sh
```

## Scheduling with Cron

```cron
# Run bidding spider daily at 6 AM
0 6 * * * cd /path/to/scrapers && ./run_all.sh >> /var/log/intel_scrapers.log 2>&1
```

## API Integration

Scraped items are pushed to Scan2Plan OS via:
- `POST /api/intel/items` - Add intel item
- `POST /api/intel/opportunities` - Add bidding opportunity
