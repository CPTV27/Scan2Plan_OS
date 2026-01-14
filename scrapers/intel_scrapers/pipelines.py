import os
import requests
from dotenv import load_dotenv

load_dotenv()


class Scan2PlanApiPipeline:
    """
    Pipeline to push scraped items to Scan2Plan OS API.
    
    Items are sent to the intel-feeds endpoint to appear
    in the Regional Intel dashboard.
    
    Uses: POST /api/intel-feeds
    """
    
    def __init__(self):
        self.api_url = os.getenv("SCAN2PLAN_API_URL", "http://localhost:5001")
        self.api_key = os.getenv("SCAN2PLAN_API_KEY", "")
        self.session = None
    
    def open_spider(self, spider):
        """Initialize session when spider opens."""
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        })
    
    def close_spider(self, spider):
        """Close session when spider closes."""
        if self.session:
            self.session.close()
    
    def _map_to_intel_item(self, item_dict, spider_name):
        """
        Map scraped item to intel-feeds API format.
        
        API expects: type, title, summary, sourceUrl, sourceName, 
                     region, deadline, estimatedValue, projectType,
                     effectiveDate, agency, competitorName, relevanceScore
        """
        category = item_dict.get("category", "general")
        
        # Map category to intel type
        if category == "bidding_opportunity":
            intel_type = "opportunity"
        elif category == "competitor_watch":
            intel_type = "competitor"
        else:
            intel_type = "policy"
        
        return {
            "type": intel_type,
            "title": item_dict.get("title", ""),
            "summary": item_dict.get("description") or item_dict.get("content", ""),
            "sourceUrl": item_dict.get("source_url", ""),
            "sourceName": item_dict.get("source", spider_name),
            "region": item_dict.get("location", "Northeast"),  # Default region
            "deadline": item_dict.get("deadline"),
            "estimatedValue": item_dict.get("estimated_value"),
            "projectType": item_dict.get("project_type"),
            "agency": item_dict.get("agency"),
            "competitorName": item_dict.get("competitor_name"),
            "relevanceScore": 75,  # Default score, can be enhanced with NLP
        }
    
    def process_item(self, item, spider):
        """
        Process each scraped item and send to API.
        """
        # Convert item to dict
        item_dict = dict(item)
        
        # Map to intel-feeds API format
        intel_item = self._map_to_intel_item(item_dict, spider.name)
        
        # Send to intel-feeds endpoint
        try:
            response = self.session.post(
                f"{self.api_url}/api/intel-feeds",
                json=intel_item,
                timeout=10,
            )
            
            if response.ok:
                spider.logger.info(f"Pushed to intel-feeds: {intel_item.get('title', 'Unknown')}")
            else:
                spider.logger.warning(
                    f"Failed to push item: {response.status_code} - {response.text}"
                )
        except Exception as e:
            spider.logger.error(f"Error pushing item to API: {e}")
            # Don't fail the pipeline, just log the error
        
        return item
