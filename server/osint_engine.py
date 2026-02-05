import httpx
import re
import json
import time
import urllib.parse
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

TIMEOUT = 8

def google_search(query, num_results=10):
    results = []
    try:
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&num={num_results}&hl=fr"
        r = httpx.get(url, headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'lxml')
            for g in soup.select('div.g, div[data-sokoban-container]'):
                link = g.select_one('a[href]')
                title = g.select_one('h3')
                snippet = g.select_one('div[data-sncf], span.st, div.VwiC3b')
                if link and title:
                    href = link.get('href', '')
                    if href.startswith('/url?q='):
                        href = href.split('/url?q=')[1].split('&')[0]
                    if href.startswith('http'):
                        results.append({
                            "title": title.get_text(strip=True),
                            "url": urllib.parse.unquote(href),
                            "snippet": snippet.get_text(strip=True) if snippet else ""
                        })
    except Exception as e:
        pass
    return results

def check_profile_exists(platform, url):
    try:
        r = httpx.get(url, headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
        if platform == "Instagram":
            return r.status_code == 200 and '"HttpErrorPage"' not in r.text and 'page isn' not in r.text.lower()
        elif platform == "Twitter/X":
            return r.status_code == 200 and 'This account doesn' not in r.text and 'hmm...this page' not in r.text.lower()
        elif platform == "GitHub":
            return r.status_code == 200 and 'Not Found' not in r.text[:500]
        elif platform == "Facebook":
            return r.status_code == 200 and 'page_not_found' not in r.text.lower()
        elif platform == "LinkedIn":
            return r.status_code == 200 and 'page-not-found' not in r.text.lower()
        return r.status_code == 200
    except:
        return None

def check_social_profiles(name, username):
    profiles_to_check = [
        {"platform": "GitHub", "url": f"https://github.com/{username}"},
        {"platform": "Instagram", "url": f"https://www.instagram.com/{username}/"},
        {"platform": "Twitter/X", "url": f"https://x.com/{username}"},
    ]
    
    name_clean = name.lower().replace(' ', '').replace('-', '')
    name_dot = name.lower().replace(' ', '.').replace('-', '.')
    name_underscore = name.lower().replace(' ', '_').replace('-', '_')
    
    extra_usernames = set([name_clean, name_dot, name_underscore]) - {username}
    for u in list(extra_usernames)[:2]:
        profiles_to_check.append({"platform": "GitHub", "url": f"https://github.com/{u}"})
        profiles_to_check.append({"platform": "Instagram", "url": f"https://www.instagram.com/{u}/"})
    
    results = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {}
        for p in profiles_to_check:
            f = executor.submit(check_profile_exists, p["platform"], p["url"])
            futures[f] = p
        
        for future in as_completed(futures, timeout=12):
            p = futures[future]
            try:
                exists = future.result()
                results.append({
                    "platform": p["platform"],
                    "url": p["url"],
                    "username": p["url"].rstrip('/').split('/')[-1],
                    "exists": exists,
                    "status": "found" if exists else ("not_found" if exists is False else "unknown")
                })
            except:
                results.append({**p, "exists": None, "status": "error", "username": p["url"].rstrip('/').split('/')[-1]})
    
    return results

def search_pages_blanches(name, city=None):
    results = []
    try:
        query = name
        if city:
            query += f" {city}"
        url = f"https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui={urllib.parse.quote(query)}&ou="
        r = httpx.get(url, headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'lxml')
            for item in soup.select('.bi-content, .bi-denomination')[:5]:
                name_el = item.select_one('.bi-denomination, .denomination')
                addr_el = item.select_one('.bi-address, .address')
                phone_el = item.select_one('.bi-phone, .phone')
                if name_el:
                    results.append({
                        "name": name_el.get_text(strip=True),
                        "address": addr_el.get_text(strip=True) if addr_el else "",
                        "phone": phone_el.get_text(strip=True) if phone_el else ""
                    })
    except:
        pass
    return results

def check_email_breaches(email):
    breaches = []
    
    try:
        url = f"https://api.xposedornot.com/v1/check-email/{urllib.parse.quote(email)}"
        r = httpx.get(url, headers={"User-Agent": HEADERS["User-Agent"]}, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            if data.get("breaches_details"):
                for b in data["breaches_details"][:10]:
                    breaches.append({
                        "name": b.get("breach", "Unknown"),
                        "domain": b.get("domain", ""),
                        "date": b.get("breachdate", ""),
                        "data_types": b.get("xposed_data", "")
                    })
    except:
        pass
    
    try:
        google_results = google_search(f'"{email}" breach OR leak OR dump OR pastebin', 5)
        for g in google_results:
            breaches.append({
                "name": f"Web mention: {g['title'][:50]}",
                "domain": g["url"],
                "date": "",
                "data_types": g["snippet"][:100]
            })
    except:
        pass
    
    return breaches

def google_deep_search(name, email=None, phone=None, city=None):
    queries = {
        "exact_name": f'"{name}"',
        "social_media": f'"{name}" site:facebook.com OR site:linkedin.com OR site:instagram.com OR site:twitter.com',
        "documents": f'"{name}" filetype:pdf OR filetype:doc OR filetype:xls',
        "forums": f'"{name}" site:forum OR site:reddit.com OR avis OR commentaire',
    }
    if email:
        queries["email_mentions"] = f'"{email}"'
        queries["email_leaks"] = f'"{email}" paste OR leak OR breach OR dump'
    if phone:
        ph_clean = re.sub(r'[\s\-\.]', '', phone)
        queries["phone_mentions"] = f'"{ph_clean}" OR "{phone}"'
    if city:
        queries["name_city"] = f'"{name}" "{city}"'
    
    all_results = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(google_search, q, 5): k for k, q in queries.items()}
        for future in as_completed(futures, timeout=20):
            key = futures[future]
            try:
                all_results[key] = future.result()
            except:
                all_results[key] = []
    
    return all_results

def run_deep_osint(person_data, all_rows=None):
    start = time.time()
    
    name = person_data.get('nom', person_data.get('nom_complet', person_data.get('name', '')))
    email = person_data.get('email', person_data.get('courriel', person_data.get('allocataire_courriel', '')))
    phone = person_data.get('telephone', person_data.get('tel', person_data.get('allocataire_telephone', '')))
    city = person_data.get('ville', person_data.get('commune', person_data.get('adresse_commune', '')))
    address = person_data.get('adresse', person_data.get('adresse_voie', ''))
    cp = person_data.get('code_postal', person_data.get('adresse_code_postal', ''))
    
    if not name:
        return None
    
    email_info = analyze_email(email) if email else {}
    phone_info = analyze_phone(phone) if phone else {}
    username = email_info.get("username", name.lower().replace(' ', '.')) if email_info else name.lower().replace(' ', '.')
    
    results = {
        "google": {},
        "social_profiles": [],
        "pages_blanches": [],
        "breaches": [],
    }
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_google = executor.submit(google_deep_search, name, email, phone, city)
        future_social = executor.submit(check_social_profiles, name, username)
        future_pb = executor.submit(search_pages_blanches, name, city)
        future_breach = executor.submit(check_email_breaches, email) if email else None
        
        try: results["google"] = future_google.result(timeout=25)
        except: pass
        try: results["social_profiles"] = future_social.result(timeout=15)
        except: pass
        try: results["pages_blanches"] = future_pb.result(timeout=10)
        except: pass
        if future_breach:
            try: results["breaches"] = future_breach.result(timeout=10)
            except: pass
    
    elapsed = round(time.time() - start, 1)
    
    google_hits = sum(len(v) for v in results["google"].values())
    social_found = [p for p in results["social_profiles"] if p.get("exists")]
    social_unknown = [p for p in results["social_profiles"] if p.get("status") == "unknown"]
    breach_count = len(results["breaches"])
    pb_count = len(results["pages_blanches"])
    
    profile = {
        "name": name,
        "email": email,
        "phone": phone,
        "city": city,
        "address": address,
        "code_postal": cp,
        "email_info": email_info,
        "phone_info": phone_info,
        "username": username,
        "google_results": results["google"],
        "social_profiles": results["social_profiles"],
        "pages_blanches": results["pages_blanches"],
        "breaches": results["breaches"],
        "total_db_results": len(all_rows) if all_rows else 0,
        "scan_time": elapsed,
        "stats": {
            "google_hits": google_hits,
            "social_found": len(social_found),
            "social_checked": len(results["social_profiles"]),
            "breaches": breach_count,
            "pages_blanches": pb_count
        }
    }
    
    return profile

def analyze_email(email):
    if not email:
        return {}
    email_lower = email.lower()
    domain = email.split('@')[-1].lower() if '@' in email else ''
    provider_map = {
        'gmail.com': 'Google', 'hotmail.com': 'Microsoft', 'hotmail.fr': 'Microsoft',
        'outlook.com': 'Microsoft', 'outlook.fr': 'Microsoft', 'yahoo.com': 'Yahoo',
        'yahoo.fr': 'Yahoo', 'orange.fr': 'Orange', 'wanadoo.fr': 'Orange (Wanadoo)',
        'free.fr': 'Free', 'sfr.fr': 'SFR', 'laposte.net': 'La Poste',
        'icloud.com': 'Apple', 'live.fr': 'Microsoft', 'live.com': 'Microsoft',
        'bbox.fr': 'Bouygues', 'numericable.fr': 'SFR (Numericable)',
        'protonmail.com': 'ProtonMail (privacy)', 'pm.me': 'ProtonMail',
        'gmx.fr': 'GMX', 'gmx.com': 'GMX', 'aol.com': 'AOL',
    }
    username = email.split('@')[0].lower()
    return {
        "email": email_lower,
        "provider": provider_map.get(domain, domain),
        "domain": domain,
        "username": username,
        "is_personal": domain in provider_map,
        "is_professional": domain not in provider_map and '.' in domain,
    }

def analyze_phone(phone):
    if not phone:
        return {}
    ph = re.sub(r'[\s\-\.]', '', phone)
    is_mobile = any(ph.startswith(p) for p in ['+336', '+337', '06', '07'])
    is_fixe = any(ph.startswith(p) for p in ['+331', '+332', '+333', '+334', '+335', '01', '02', '03', '04', '05'])
    return {
        "number": phone,
        "clean": ph,
        "type": "Mobile" if is_mobile else ("Fixe" if is_fixe else "Unknown"),
        "country": "France" if '+33' in ph or (ph.startswith('0') and len(ph) >= 10) else "Unknown",
        "formatted": f"+33 {ph[3]} {ph[4:6]} {ph[6:8]} {ph[8:10]} {ph[10:12]}" if ph.startswith('+33') and len(ph) >= 12 else ph,
    }
