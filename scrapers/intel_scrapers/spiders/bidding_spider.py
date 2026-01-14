import scrapy
from datetime import datetime


class BiddingItem(scrapy.Item):
    """Item for bidding opportunities"""
    title = scrapy.Field()
    description = scrapy.Field()
    source = scrapy.Field()
    source_url = scrapy.Field()
    deadline = scrapy.Field()
    location = scrapy.Field()
    estimated_value = scrapy.Field()
    agency = scrapy.Field()
    category = scrapy.Field()
    scraped_at = scrapy.Field()


class BiddingSpider(scrapy.Spider):
    """
    Spider for scraping bidding opportunities.
    
    This is a template spider. You'll need to customize the URLs
    and parsing logic for your specific bidding sites.
    
    Example target sites (require customization):
    - BidNet (bidnet.com)
    - DodgeBidTracker (dodgedata.com)
    - Government procurement portals
    """
    name = "bidding"
    allowed_domains = [
        "example-bids.gov",  # Replace with actual domains
    ]
    start_urls = [
        # Add your bidding site URLs here
        # "https://example-bids.gov/opportunities",
    ]

    # Keywords to filter relevant opportunities
    keywords = [
        "laser scanning",
        "3d scanning",
        "bim",
        "building information modeling",
        "as-built",
        "survey",
        "lidar",
        "point cloud",
        "revit",
        "facility management",
    ]

    def parse(self, response):
        """
        Parse the bidding opportunity listing page.
        
        This is a template - customize for your specific sites.
        """
        # Example parsing logic (customize for actual sites)
        for opportunity in response.css(".opportunity-listing"):
            title = opportunity.css(".title::text").get()
            
            # Filter by keywords
            if not any(kw in title.lower() for kw in self.keywords):
                continue
            
            item = BiddingItem()
            item["title"] = title
            item["description"] = opportunity.css(".description::text").get()
            item["source"] = self.name
            item["source_url"] = response.urljoin(opportunity.css("a::attr(href)").get())
            item["deadline"] = opportunity.css(".deadline::text").get()
            item["location"] = opportunity.css(".location::text").get()
            item["agency"] = opportunity.css(".agency::text").get()
            item["category"] = "bidding_opportunity"
            item["scraped_at"] = datetime.utcnow().isoformat()
            
            yield item

        # Follow pagination
        next_page = response.css(".pagination .next a::attr(href)").get()
        if next_page:
            yield response.follow(next_page, self.parse)
