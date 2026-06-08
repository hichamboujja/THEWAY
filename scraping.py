import os
import re
import csv
import json
import time
import hashlib
import requests
import mysql.connector
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.parse import urljoin, urlparse, urldefrag

load_dotenv()

# ==========================================================
# CONFIGURATION
# ==========================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT_DIR = os.path.join(BASE_DIR, "assets", "uploads", "files")
os.makedirs(EXPORT_DIR, exist_ok=True)

CSV_FILE = os.path.join(EXPORT_DIR, "opportunities.csv")
JSON_FILE = os.path.join(EXPORT_DIR, "opportunities.json")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "theway"),
    "use_pure": True,
}

MAX_PAGES_PER_SOURCE = int(os.getenv("SCRAPER_MAX_PAGES", "120"))
MAX_OPPORTUNITIES = int(os.getenv("SCRAPER_MAX_OPPORTUNITIES", "800"))
REQUEST_DELAY = float(os.getenv("SCRAPER_DELAY", "1"))

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

# Ces skills ne filtrent PAS les offres.
# Ils servent seulement à remplir la colonne skills si des mots-clés existent dans la description.
SKILLS_KEYWORDS = [
    # IT / Développement
    "HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Angular", "Vue",
    "Node.js", "Express", "PHP", "Laravel", "Symfony", "Python", "Django", "Flask",
    "Java", "Spring", "Spring Boot", "C#", ".NET", "ASP.NET", "C++", "C",
    "Ruby", "Go", "Kotlin", "Swift", "Flutter", "Dart",

    # Database / Cloud / DevOps
    "MySQL", "PostgreSQL", "MongoDB", "SQL", "Oracle", "SQLite",
    "Docker", "Kubernetes", "Git", "GitHub", "GitLab", "REST", "API", "GraphQL",
    "Linux", "Ubuntu", "AWS", "Azure", "Google Cloud", "DevOps", "CI/CD",

    # Cybersecurity
    "Cybersecurity", "Cybersécurité", "Sécurité", "Pentest", "OWASP", "SOC",
    "Firewall", "SIEM", "ISO 27001", "Risk Management",

    # Data / IA
    "Data", "Data Analyst", "Data Science", "Machine Learning", "AI", "IA",
    "Power BI", "Tableau", "Excel", "Big Data", "ETL",

    # Design / Marketing / Digital
    "Figma", "UI", "UX", "Photoshop", "Illustrator", "Canva",
    "SEO", "SEA", "Google Ads", "Meta Ads", "Marketing Digital",
    "Community Management", "Social Media", "Content Marketing",

    # Commerce / Vente
    "Commercial", "Vente", "Prospection", "Négociation", "CRM",
    "Relation Client", "B2B", "B2C", "Business Development",
    "Account Manager", "Sales", "Télévente",

    # Finance / Comptabilité
    "Comptabilité", "Finance", "Audit", "Contrôle de gestion",
    "Fiscalité", "Paie", "Sage", "SAP", "ERP",

    # RH / Administration
    "Ressources Humaines", "RH", "Recrutement", "Formation",
    "Administration", "Gestion administrative", "Office", "Microsoft Office",

    # Logistique / Industrie
    "Logistique", "Supply Chain", "Achat", "Approvisionnement",
    "Production", "Qualité", "Maintenance", "HSE", "QHSE",
    "Lean", "Six Sigma", "AutoCAD", "SolidWorks",

    # Langues
    "Français", "Anglais", "Espagnol", "Arabe",
]

# Sources avec plusieurs catégories pour récupérer un maximum d'offres
SOURCES = [
    {
        "name": "Rekrute",
        "base": "https://www.rekrute.com",
        "seeds": [
            "https://www.rekrute.com/offres.html",
            "https://www.rekrute.com/offres.html?p=2&s=1&o=1",
            "https://www.rekrute.com/offres.html?p=3&s=1&o=1",
            "https://www.rekrute.com/offres.html?p=4&s=1&o=1",

            "https://www.rekrute.com/offres-emploi-casablanca.html",
            "https://www.rekrute.com/offres-emploi-rabat.html",
            "https://www.rekrute.com/offres-emploi-tanger.html",
            "https://www.rekrute.com/offres-emploi-marrakech.html",

            "https://www.rekrute.com/offres-emploi-informatique-24.html",
            "https://www.rekrute.com/offres-emploi-commercial-vente-export-fonction-27.html",
            "https://www.rekrute.com/offres-emploi-gestion-comptabilite-finance-fonction-12.html",
            "https://www.rekrute.com/offres-emploi-rh-personnel-formation-fonction-21.html",
            "https://www.rekrute.com/offres-emploi-marketing-ebusiness-fonction-16.html",
            "https://www.rekrute.com/offres-emploi-centre-d-appel-call-center.html",
            "https://www.rekrute.com/offres-emploi-btp-genie-civil-11.html",
            "https://www.rekrute.com/offres-emploi-hotellerie-restauration-22.html",
            "https://www.rekrute.com/offres-emploi-banque-finance-10.html",
            "https://www.rekrute.com/offres-emploi-automobile-motos-cycles-7.html",
            "https://www.rekrute.com/offres-emploi-assurance-courtage-5.html",
        ],
    },
    {
        "name": "Emploi.ma",
        "base": "https://www.emploi.ma",
        "seeds": [
            "https://www.emploi.ma/recherche-jobs-maroc",
            "https://www.emploi.ma/recherche-jobs-maroc?page=1",
            "https://www.emploi.ma/recherche-jobs-maroc?page=2",
            "https://www.emploi.ma/recherche-jobs-maroc?page=3",
            "https://www.emploi.ma/recherche-jobs-maroc?page=4",
            "https://www.emploi.ma/recherche-jobs-maroc?page=5",
            "https://www.emploi.ma/recherche-jobs-maroc?page=6",
            "https://www.emploi.ma/recherche-jobs-maroc?page=7",
            "https://www.emploi.ma/recherche-jobs-maroc?page=8",
            "https://www.emploi.ma/recherche-jobs-maroc?page=9",
            "https://www.emploi.ma/recherche-jobs-maroc?page=10",
        ],
    },
    {
        "name": "MarocAnnonces",
        "base": "https://www.marocannonces.com",
        "seeds": [
            "https://www.marocannonces.com/categorie/309/Offres-emploi.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/2.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/3.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/4.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/5.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/6.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/7.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/8.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/9.html",
            "https://www.marocannonces.com/categorie/309/Offres-emploi/10.html",
        ],
    },
]


# ==========================================================
# UTILITIES
# ==========================================================

def clean_text(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def normalize_url(url):
    url, _ = urldefrag(url)
    return url.strip()


def get_domain(url):
    return urlparse(url).netloc.replace("www.", "")


def is_same_domain(url, base_url):
    return get_domain(url) == get_domain(base_url)


def fix_marocannonces_url(url):
    url = url.replace(
        "https://www.marocannonces.com/categorie/309/Emploi/categorie/309/",
        "https://www.marocannonces.com/categorie/309/"
    )

    url = url.replace(
        "https://www.marocannonces.com/categorie/309/Emploi/",
        "https://www.marocannonces.com/"
    )

    url = url.replace(
        "https://www.marocannonces.com/categorie/309/Offres-emploi/Offres-emploi/",
        "https://www.marocannonces.com/categorie/309/Offres-emploi/"
    )

    return url


def is_valid_html_link(url):
    lower = url.lower()

    blocked_extensions = (
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
        ".pdf", ".zip", ".rar", ".css", ".js", ".mp4", ".mp3"
    )

    if any(lower.endswith(ext) for ext in blocked_extensions):
        return False

    blocked_words = [
        "facebook", "twitter", "instagram", "youtube", "linkedin.com/company",
        "mailto:", "tel:", "javascript:",
        "login", "connexion", "register", "inscription", "signup",
        "privacy", "conditions", "contact", "aide", "help",
        "faq", "mentions", "qui-sommes-nous",
        "recherche-base-donnees-cv"
    ]

    return not any(word in lower for word in blocked_words)


def is_opportunity_link(url):
    lower = url.lower()

    valid_patterns = [
        # Rekrute
        "rekrute.com/offre-emploi-",

        # Emploi.ma
        "emploi.ma/offre-emploi-maroc/",

        # MarocAnnonces
        "marocannonces.com/categorie/309/offres-emploi/annonce/",
        "marocannonces.com/categorie/309/emploi/offres-emploi/annonce/",
    ]

    return any(pattern in lower for pattern in valid_patterns)


def is_listing_link(url):
    lower = url.lower()

    blocked = [
        "recruteur",
        "recruteurs",
        "qui-sommes-nous",
        "mentions-legales",
        "faq",
        "questions-frequemment",
        "recrutement/annonce",
        "recherche-base-donnees-cv",
        "article",
        "conseils-carriere",
        "actualite"
    ]

    if any(word in lower for word in blocked):
        return False

    valid_patterns = [
        # Rekrute listings
        "rekrute.com/offres.html",
        "rekrute.com/offres-emploi-",

        # Emploi.ma listings
        "emploi.ma/recherche-jobs-maroc",

        # MarocAnnonces listings
        "marocannonces.com/categorie/309/offres-emploi",
    ]

    return any(pattern in lower for pattern in valid_patterns)


def request_page(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code != 200:
            print(f"[SKIP] {response.status_code}: {url}")
            return None

        content_type = response.headers.get("Content-Type", "").lower()

        if "html" not in content_type:
            return None

        return response.text

    except requests.exceptions.Timeout:
        print(f"[TIMEOUT] {url}")
        return None

    except Exception as e:
        print(f"[ERROR] {url} -> {e}")
        return None


# ==========================================================
# EXTRACTION
# ==========================================================

def extract_links(html, current_url, base_url):
    soup = BeautifulSoup(html, "html.parser")
    links = set()

    for a in soup.select("a[href]"):
        href = a.get("href")

        if not href:
            continue

        absolute = normalize_url(urljoin(current_url, href))
        absolute = fix_marocannonces_url(absolute)

        if not is_valid_html_link(absolute):
            continue

        if not is_same_domain(absolute, base_url):
            continue

        if is_opportunity_link(absolute) or is_listing_link(absolute):
            links.add(absolute)

    return links


def extract_skills(text):
    found = []

    for skill in SKILLS_KEYWORDS:
        pattern = r"(?<![A-Za-z0-9])" + re.escape(skill) + r"(?![A-Za-z0-9])"

        if re.search(pattern, text, re.IGNORECASE):
            found.append(skill)

    return sorted(list(set(found)))


def detect_location(text):
    cities = [
        "Casablanca", "Rabat", "Tanger", "Marrakech", "Fès", "Fez",
        "Agadir", "Meknès", "Oujda", "Tétouan", "Kenitra",
        "Mohammedia", "El Jadida", "Settat", "Safi", "Nador",
        "Laâyoune", "Laayoune", "Dakhla", "Béni Mellal", "Beni Mellal",
        "Khouribga", "Berrechid", "Nouaceur", "Salé", "Sale",
        "Morocco", "Maroc", "Remote", "Télétravail", "Hybride"
    ]

    found = []

    for city in cities:
        if re.search(r"\b" + re.escape(city) + r"\b", text, re.IGNORECASE):
            found.append(city)

    return ", ".join(sorted(set(found))) if found else "Non spécifié"


def detect_company(soup):
    selectors = [
        ".company", ".company-name", ".recruiter", ".employer",
        ".job-company", ".card-company",
        "[class*=company]", "[class*=entreprise]", "[class*=recruteur]"
    ]

    for selector in selectors:
        item = soup.select_one(selector)

        if item:
            value = clean_text(item.get_text(" "))

            if 2 <= len(value) <= 120:
                return value

    title = soup.title.get_text(" ") if soup.title else ""

    if " - " in title:
        parts = [clean_text(p) for p in title.split(" - ")]
        if len(parts) >= 2 and 2 <= len(parts[-1]) <= 120:
            return parts[-1]

    return "Non spécifié"


def extract_title(soup):
    selectors = [
        "h1",
        ".job-title",
        ".title",
        "[class*=job-title]",
        "[class*=offre-title]",
        "[class*=annonce-title]"
    ]

    for selector in selectors:
        item = soup.select_one(selector)

        if item:
            value = clean_text(item.get_text(" "))

            if 5 <= len(value) <= 180:
                return value

    if soup.title:
        return clean_text(soup.title.get_text(" "))[:180]

    return "Opportunity"


def extract_description(soup):
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()

    selectors = [
        ".description",
        ".job-description",
        ".content",
        ".details",
        ".post-content",
        "[class*=description]",
        "[class*=detail]",
        "[class*=mission]",
        "main",
        "article",
        "body"
    ]

    best_text = ""

    for selector in selectors:
        item = soup.select_one(selector)

        if item:
            text = clean_text(item.get_text(" "))

            if len(text) > len(best_text):
                best_text = text

    return best_text[:6000]


def make_unique_id(url, title):
    raw = f"{url}-{title}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def parse_opportunity(url, source_name):
    if not is_opportunity_link(url):
        return None

    html = request_page(url)

    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")

    title = extract_title(soup)
    description = extract_description(soup)
    company = detect_company(soup)
    location = detect_location(description + " " + title)
    skills = extract_skills(description + " " + title)

    # Ne filtre pas par skills.
    # Même si skills est vide, l'offre doit être sauvegardée.
    if len(description) < 80:
        return None

    return {
        "uid": make_unique_id(url, title),
        "source": source_name,
        "title": title,
        "company": company,
        "location": location,
        "source_url": url,
        "description": description,
        "skills": skills,
    }


# ==========================================================
# DATABASE
# ==========================================================

def ensure_column(cursor, table, column, definition):
    cursor.execute(f"SHOW COLUMNS FROM {table} LIKE %s", (column,))
    exists = cursor.fetchone()

    if not exists:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_database():
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            use_pure=True
        )

        cursor = connection.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        cursor.close()
        connection.close()

        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS opportunities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uid VARCHAR(64) UNIQUE,
                source VARCHAR(100),
                title VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                location VARCHAR(255),
                source_url TEXT,
                description TEXT,
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """)

        ensure_column(cursor, "opportunities", "uid", "VARCHAR(64) UNIQUE")
        ensure_column(cursor, "opportunities", "source", "VARCHAR(100)")
        ensure_column(cursor, "opportunities", "company", "VARCHAR(255)")
        ensure_column(cursor, "opportunities", "location", "VARCHAR(255)")
        ensure_column(cursor, "opportunities", "source_url", "TEXT")
        ensure_column(cursor, "opportunities", "description", "TEXT")
        ensure_column(cursor, "opportunities", "skills", "TEXT")

        connection.commit()
        cursor.close()
        connection.close()

        print("[DB] MySQL prêt.")
        return True

    except Exception as e:
        print(f"[DB WARNING] MySQL indisponible: {e}")
        print("[DB WARNING] Les résultats seront sauvegardés en CSV/JSON seulement.")
        return False


def save_to_database(opportunity):
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        sql = """
            INSERT INTO opportunities
            (uid, source, title, company, location, source_url, description, skills)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                source = VALUES(source),
                title = VALUES(title),
                company = VALUES(company),
                location = VALUES(location),
                source_url = VALUES(source_url),
                description = VALUES(description),
                skills = VALUES(skills)
        """

        values = (
            opportunity["uid"],
            opportunity["source"],
            opportunity["title"],
            opportunity["company"],
            opportunity["location"],
            opportunity["source_url"],
            opportunity["description"],
            ", ".join(opportunity["skills"]),
        )

        cursor.execute(sql, values)
        connection.commit()

        cursor.close()
        connection.close()

    except Exception as e:
        print(f"[DB ERROR] Save failed: {e}")


# ==========================================================
# EXPORTS
# ==========================================================

def save_exports(opportunities):
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(opportunities, f, ensure_ascii=False, indent=2)

    with open(CSV_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "source",
                "title",
                "company",
                "location",
                "source_url",
                "skills",
                "description"
            ]
        )

        writer.writeheader()

        for opp in opportunities:
            writer.writerow({
                "source": opp["source"],
                "title": opp["title"],
                "company": opp["company"],
                "location": opp["location"],
                "source_url": opp["source_url"],
                "skills": ", ".join(opp["skills"]),
                "description": opp["description"],
            })

    print(f"[EXPORT] JSON: {JSON_FILE}")
    print(f"[EXPORT] CSV: {CSV_FILE}")


# ==========================================================
# CRAWLER
# ==========================================================

def crawl_source(source):
    print(f"\n========== SOURCE: {source['name']} ==========")

    base_url = source["base"]
    queue = list(source["seeds"])
    visited_pages = set()
    opportunity_links = set()

    while queue and len(visited_pages) < MAX_PAGES_PER_SOURCE:
        current_url = normalize_url(queue.pop(0))

        if current_url in visited_pages:
            continue

        visited_pages.add(current_url)

        print(f"[CRAWL] {len(visited_pages)}/{MAX_PAGES_PER_SOURCE}: {current_url}")

        html = request_page(current_url)

        if not html:
            continue

        links = extract_links(html, current_url, base_url)

        for link in links:
            if is_opportunity_link(link):
                opportunity_links.add(link)

            if is_listing_link(link) and link not in visited_pages and link not in queue:
                queue.append(link)

        time.sleep(REQUEST_DELAY)

    print(f"[FOUND] {source['name']}: {len(opportunity_links)} vraies offres possibles")
    return list(opportunity_links)


def run_scraper():
    print("[START] Scraper opportunities", flush=True)
    mysql_ready = init_database()

    all_links = []

    for source in SOURCES:
        links = crawl_source(source)

        for link in links:
            all_links.append({
                "source": source["name"],
                "url": link
            })

    unique_links = []
    seen_urls = set()

    for item in all_links:
        if item["url"] not in seen_urls:
            seen_urls.add(item["url"])
            unique_links.append(item)

    print(f"\n[INFO] Total offres uniques collectées: {len(unique_links)}")

    opportunities = []
    seen_uids = set()

    for index, item in enumerate(unique_links, start=1):
        if len(opportunities) >= MAX_OPPORTUNITIES:
            break

        print(f"\n[PARSE] {index}/{len(unique_links)}: {item['url']}")

        opportunity = parse_opportunity(item["url"], item["source"])

        if not opportunity:
            print("[SKIP] Pas assez d'information.")
            continue

        if opportunity["uid"] in seen_uids:
            print("[SKIP] Doublon.")
            continue

        seen_uids.add(opportunity["uid"])
        opportunities.append(opportunity)

        print(f"[OK] {opportunity['title']}")
        print(f"     Source: {opportunity['source']}")
        print(f"     Company: {opportunity['company']}")
        print(f"     Location: {opportunity['location']}")
        print(f"     Skills: {', '.join(opportunity['skills']) if opportunity['skills'] else 'Aucun'}")

        if mysql_ready:
            save_to_database(opportunity)

        time.sleep(REQUEST_DELAY)

    save_exports(opportunities)

    print("\n========== FINISHED ==========")
    print(f"Opportunities sauvegardées: {len(opportunities)}")
    print(f"CSV: {CSV_FILE}")
    print(f"JSON: {JSON_FILE}")


if __name__ == "__main__":
    run_scraper()
