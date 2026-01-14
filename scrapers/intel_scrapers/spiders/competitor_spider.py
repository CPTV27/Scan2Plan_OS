import scrapy
from datetime import datetime


class CompetitorItem(scrapy.Item):
    """Item for competitor intelligence"""
    title = scrapy.Field()
    content = scrapy.Field()
    source = scrapy.Field()
    source_url = scrapy.Field()
    competitor_name = scrapy.Field()
    category = scrapy.Field()
    scraped_at = scrapy.Field()


class CompetitorSpider(scrapy.Spider):
    """
    Spider for monitoring competitor websites.
    
    Tracks news, blog posts, job listings, and other public updates
    from competitor companies in the laser scanning / BIM space.
    """
    name = "competitor"
    
    # Define competitors to monitor
    # Replace with actual competitor sites
    competitors = {
        "competitor_a": {
            "domain": "example-competitor-a.com",
            "news_url": "https://example-competitor-a.com/news",
            "blog_url": "https://example-competitor-a.com/blog",
        },
        "competitor_b": {
            "domain": "example-competitor-b.com",
            "news_url": "https://example-competitor-b.com/news",
        },
    }

    def start_requests(self):
        """Generate requests for each competitor's news/blog pages."""
        for name, urls in self.competitors.items():
            for url_type, url in urls.items():
                if url_type.endswith("_url"):
                    yield scrapy.Request(
                        url,
                        callback=self.parse_updates,
                        meta={"competitor_name": name},
                        dont_filter=True,
                    )

    def parse_updates(self, response):
        """
        Parse competitor news/blog pages.
        
        This is a template - customize selectors for each competitor.
        """
        competitor_name = response.meta.get("competitor_name")
        
        # Example parsing (customize for actual sites)
        for article in response.css("article, .news-item, .blog-post"):
            item = CompetitorItem()
            item["title"] = article.css("h2::text, h3::text, .title::text").get()
            item["content"] = " ".join(article.css("p::text").getall()[:2])  # First 2 paragraphs
            item["source"] = self.name
            item["source_url"] = response.urljoin(article.css("a::attr(href)").get())
            item["competitor_name"] = competitor_name
            item["category"] = "competitor_watch"
            item["scraped_at"] = datetime.utcnow().isoformat()
            
            yield item
