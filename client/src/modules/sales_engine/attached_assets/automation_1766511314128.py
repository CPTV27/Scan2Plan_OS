import requests
import json
import os
import glob

# --- CONFIGURATION ---
API_KEY = "c506b9fc1d22c086a42f6fa9e30d760be4a0ea20"
TEMPLATE_UUID = "3WRLKxtPBUUzcYxLy5pSkg"
API_URL = "https://api.pandadoc.com/public/v1/documents"

def get_latest_json():
    """Finds the most recently created .json file in the current directory."""
    list_of_files = glob.glob('*.json')
    if not list_of_files:
        return None
    return max(list_of_files, key=os.path.getctime)

def create_pandadoc_proposal():
    # 1. ADAPTIVE FILE LOADING
    json_file = get_latest_json()
    if not json_file:
        print("Error: No .json files found.")
        return

    print(f"Loading data from: {json_file}")
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return

    # 2. EXTRACT CORE DETAILS
    project_details = data.get('projectDetails', {})
    project_address = project_details.get('projectAddress', "No Address Provided")
    crm_data = data.get('crmData', {})
    contact_email = crm_data.get('accountContactEmail', "")
    
    # Handle Name
    raw_contact = crm_data.get('accountContact', "")
    if ',' in raw_contact:
        parts = raw_contact.split(', ')
        first, last = (parts[1], parts[0]) if len(parts) > 1 else (parts[0], "")
    else:
        # Split by space if no comma
        parts = raw_contact.split(' ')
        first = parts[0]
        last = " ".join(parts[1:]) if len(parts) > 1 else ""

    # 3. AREA & SCOPE LOGIC
    areas = data.get('areas', [])
    type_map = {
        "1": "Residential - Single Family", "2": "Residential - Multi Family",
        "3": "Residential - Luxury", "4": "Commercial / Office",
        "5": "Retail / Restaurants", "6": "Kitchen / Catering Facilities",
        "7": "Education", "8": "Hotel / Theatre / Museum",
        "9": "Hospitals / Mixed Use", "10": "Mechanical / Utility Rooms",
        "11": "Warehouse / Storage", "12": "Religious Buildings",
        "13": "Infrastructure", "14": "Built Landscape",
        "15": "Natural Landscape", "16": "ACT (Ceiling Tiles)"
    }

    # A. Service Line (Header) - Uses the first area's type as the primary
    primary_area = areas[0] if areas else {}
    b_type_id = str(primary_area.get('buildingType', '4'))
    type_label = type_map.get(b_type_id, "Standard")
    
    if b_type_id in ["1", "2", "3"]:
        service_prefix = "Residential Service"
    else:
        service_prefix = "Commercial Service"
        
    service_line = f"{service_prefix} for {project_address} - {type_label}"

    # B. Build "Project.AreasList" (The Detail Block)
    # We will build a text block describing each area individually.
    area_descriptions = []
    all_disciplines = set() # To track unique services for the global lists

    for area in areas:
        name = area.get('name', 'Area')
        sqft = area.get('squareFeet', '0')
        lod = area.get('disciplineLods', {}).get('architecture', '300')
        disciplines = area.get('disciplines', [])
        
        # Track for later
        for d in disciplines: all_disciplines.add(d)
        if area.get('gradeAroundBuilding'): all_disciplines.add('grade')
        
        # Build Scope String for this specific area
        extras = []
        if 'mepf' in disciplines: extras.append("MEPF")
        if 'structure' in disciplines: extras.append("Structure")
        if 'site' in disciplines or area.get('gradeAroundBuilding'): extras.append("Site/Grade")
        if 'matterport' in disciplines: extras.append("Matterport")
        
        extras_str = " + ".join(extras)
        if extras_str:
            desc = f"• {name}: {sqft} sqft - LoD {lod} + {extras_str}"
        else:
            desc = f"• {name}: {sqft} sqft - LoD {lod}"
            
        area_descriptions.append(desc)

    # Join them into one block of text
    areas_list_block = "\n".join(area_descriptions)

    # C. Build Scope & Deliverables Lists (Aggregated)
    # Scope of Work
    scope_items = [
        "End-to-end project management and customer service",
        "LiDAR Scan - A scanning technician will capture the interior and exterior."
    ]
    if 'matterport' in all_disciplines:
        scope_items.append("Matterport Scan - A scanning technician will capture the interior.")
    
    scope_items.append("Registration - Point cloud data registered, cleaned, and reviewed.")
    scope_items.append("BIM Modeling - Revit model creation.")
    scope_items.append("QA/QC - Redundant review by engineering staff.")
    
    scope_bullets = "\n".join([f"• {item}" for item in scope_items])

    # Deliverables
    deliv_items = ["Total Square Footage Audit"]
    
    # Construct a "Global Scope" string for the Deliverables line
    global_scope_parts = ["LoD 300"] # Defaulting to 300 for simplicity, or could detect max
    if 'mepf' in all_disciplines: global_scope_parts.append("MEPF")
    if 'structure' in all_disciplines: global_scope_parts.append("Structure")
    if 'site' in all_disciplines or 'grade' in all_disciplines: global_scope_parts.append("Site/Grade")
    
    deliv_items.append(f"Revit Model - {' + '.join(global_scope_parts)}")
    
    if 'matterport' in all_disciplines:
        deliv_items.append("Matterport 3D Tour")
        
    deliv_items.append("Colorized Point Cloud (.rcp format)")
    deliv_bullets = "\n".join([f"• {item}" for item in deliv_items])


    # 4. FORMAT PRICING TABLE ROWS
    pricing = data.get('pricing', {})
    line_items = pricing.get('lineItems', [])
    rows = []
    for item in line_items:
        if not item.get('isTotal'): 
            rows.append({
                "options": {"qty": 1, "name": item.get('label', 'Service'), "price": item.get('value', 0)},
                "data": {"name": item.get('label', 'Service'), "price": item.get('value', 0), "qty": 1}
            })

    # 5. CONSTRUCT PAYLOAD
    payload = {
        "name": f"Proposal: {project_address}",
        "template_uuid": TEMPLATE_UUID,
        "recipients": [{"email": contact_email, "first_name": first, "last_name": last, "role": "Client"}],
        "tokens": [
            {"name": "Project.Address", "value": project_address},
            {"name": "Project.ServiceLine", "value": service_line},
            # Replaces the old single-line "FullScope" with the detailed list
            {"name": "Project.AreasList", "value": areas_list_block}, 
            {"name": "Scope.List", "value": scope_bullets},
            {"name": "Deliverables.List", "value": deliv_bullets}
        ],
        "pricing_tables": [
            {
                "name": "Pricing Table 1",
                "sections": [{"title": "Services Scope", "default": True, "rows": rows}]
            }
        ]
    }

    # 6. EXECUTE
    headers = {"Authorization": f"API-Key {API_KEY}", "Content-Type": "application/json"}
    print(f"Generating proposal for: {service_line}")
    response = requests.post(API_URL, json=payload, headers=headers)

    if response.status_code == 201:
        doc_id = response.json()['id']
        print(f"\n--- SUCCESS ---\nView Draft: https://app.pandadoc.com/a/#/documents/{doc_id}")
    else:
        print(f"\n--- FAILED ---\n{response.text}")

if __name__ == "__main__":
    create_pandadoc_proposal()