# Scrapy settings for intel_scrapers project

BOT_NAME = "intel_scrapers"

SPIDER_MODULES = ["intel_scrapers.spiders"]
NEWSPIDER_MODULE = "intel_scrapers.spiders"

# Crawl responsibly
ROBOTSTXT_OBEY = True

# Configure delays and concurrency
DOWNLOAD_DELAY = 2  # Be respectful, 2 seconds between requests
CONCURRENT_REQUESTS = 4

# Disable cookies (not needed for public sites)
COOKIES_ENABLED = False

# Enable and configure the AutoThrottle extension
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0

# User agent
USER_AGENT = "Scan2Plan Intel Bot (+https://scan2plan.io)"

# Enable the item pipeline for API integration
ITEM_PIPELINES = {
    "intel_scrapers.pipelines.Scan2PlanApiPipeline": 300,
}

# Output settings
FEED_EXPORTERS = {
    "json": "scrapy.exporters.JsonItemExporter",
}

# Logging
LOG_LEVEL = "INFO"
