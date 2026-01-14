import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()


class Scan2PlanApiPipeline:
    """
    Pipeline to push scraped items to Scan2Plan OS API.
    
    Items are sent to the intel-feeds endpoint to appear
    in the Regional Intel dashboard.
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
    
    def process_item(self, item, spider):
        """
        Process each scraped item and send to API.
        """
        # Convert item to dict
        item_dict = dict(item)
        
        # Determine endpoint based on category
        category = item_dict.get("category", "general")
        
        if category == "bidding_opportunity":
            endpoint = "/api/intel/opportunities"
        elif category == "competitor_watch":
            endpoint = "/api/intel/competitor"
        else:
            endpoint = "/api/intel/items"
        
        # Send to API
        try:
            response = self.session.post(
                f"{self.api_url}{endpoint}",
                json=item_dict,
                timeout=10,
            )
            
            if response.ok:
                spider.logger.info(f"Successfully pushed item: {item_dict.get('title', 'Unknown')}")
            else:
                spider.logger.warning(
                    f"Failed to push item: {response.status_code} - {response.text}"
                )
        except Exception as e:
            spider.logger.error(f"Error pushing item to API: {e}")
            # Don't fail the pipeline, just log the error
        
        return item
