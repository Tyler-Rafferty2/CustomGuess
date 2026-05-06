#!/usr/bin/env python3
"""
Downloads character images from Wikipedia into local folders.
One folder per set, named after the set. Includes a cover image per set.

Usage:
    python3 scripts/download_sets.py
    python3 scripts/download_sets.py --out ./my_sets   # custom output dir

Output structure:
    sets/
      US Presidents/
        cover.jpg
        George Washington.jpg
        Abraham Lincoln.jpg
        ...
      Wild Animals/
        cover.jpg
        Lion.jpg
        ...
"""

import argparse
import os
import re
import time
import urllib.parse
import urllib.request

WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"
HEADERS  = {"User-Agent": "GuessWhoSeeder/1.0 (contact@guesswho.app)"}
DELAY    = 0.4   # seconds between Wikipedia requests


# ---------------------------------------------------------------------------
# Set definitions
# Each character has (display_name, wikipedia_article_title).
# The first character listed is used as the cover image.
# ---------------------------------------------------------------------------
SETS = [
    {
        "name": "US Presidents",
        "description": "Guess which president it is! From founding fathers to modern leaders.",
        "cover_index": 4,   # Theodore Roosevelt — iconic portrait
        "characters": [
            ("George Washington",   "George Washington"),
            ("John Adams",          "John Adams"),
            ("Thomas Jefferson",    "Thomas Jefferson"),
            ("Abraham Lincoln",     "Abraham Lincoln"),
            ("Theodore Roosevelt",  "Theodore Roosevelt"),
            ("Woodrow Wilson",      "Woodrow Wilson"),
            ("Franklin Roosevelt",  "Franklin D. Roosevelt"),
            ("Harry Truman",        "Harry S. Truman"),
            ("Dwight Eisenhower",   "Dwight D. Eisenhower"),
            ("John F. Kennedy",     "John F. Kennedy"),
            ("Lyndon Johnson",      "Lyndon B. Johnson"),
            ("Richard Nixon",       "Richard Nixon"),
            ("Ronald Reagan",       "Ronald Reagan"),
            ("Bill Clinton",        "Bill Clinton"),
            ("George W. Bush",      "George W. Bush"),
            ("Barack Obama",        "Barack Obama"),
        ],
    },
    {
        "name": "Famous Scientists",
        "description": "From Newton to Hawking — can you name these brilliant minds?",
        "cover_index": 0,   # Albert Einstein
        "characters": [
            ("Albert Einstein",     "Albert Einstein"),
            ("Isaac Newton",        "Isaac Newton"),
            ("Charles Darwin",      "Charles Darwin"),
            ("Marie Curie",         "Marie Curie"),
            ("Nikola Tesla",        "Nikola Tesla"),
            ("Stephen Hawking",     "Stephen Hawking"),
            ("Richard Feynman",     "Richard Feynman"),
            ("Galileo Galilei",     "Galileo Galilei"),
            ("Carl Sagan",          "Carl Sagan"),
            ("Ada Lovelace",        "Ada Lovelace"),
            ("Alan Turing",         "Alan Turing"),
            ("Louis Pasteur",       "Louis Pasteur"),
            ("Michael Faraday",     "Michael Faraday"),
            ("James Watt",          "James Watt"),
            ("Alexander Fleming",   "Alexander Fleming"),
            ("Ernest Rutherford",   "Ernest Rutherford"),
        ],
    },
    {
        "name": "Wild Animals",
        "description": "Lions and tigers and bears — can you guess them all?",
        "cover_index": 0,   # Lion
        "characters": [
            ("Lion",               "Lion"),
            ("Tiger",              "Tiger"),
            ("African Elephant",   "African elephant"),
            ("Giraffe",            "Giraffe"),
            ("Gorilla",            "Gorilla"),
            ("Cheetah",            "Cheetah"),
            ("Polar Bear",         "Polar bear"),
            ("Giant Panda",        "Giant panda"),
            ("Gray Wolf",          "Gray wolf"),
            ("Bald Eagle",         "Bald eagle"),
            ("Bottlenose Dolphin", "Common bottlenose dolphin"),
            ("Great White Shark",  "Great white shark"),
            ("Nile Crocodile",     "Nile crocodile"),
            ("Emperor Penguin",    "Emperor penguin"),
            ("Red Kangaroo",       "Red kangaroo"),
            ("Red Fox",            "Red fox"),
        ],
    },
    {
        "name": "Classical Composers",
        "description": "Do you know your Beethoven from your Bach?",
        "cover_index": 1,   # Ludwig van Beethoven
        "characters": [
            ("J.S. Bach",          "Johann Sebastian Bach"),
            ("Ludwig van Beethoven","Ludwig van Beethoven"),
            ("Wolfgang Mozart",    "Wolfgang Amadeus Mozart"),
            ("Frederic Chopin",    "Frédéric Chopin"),
            ("Franz Schubert",     "Franz Schubert"),
            ("Johannes Brahms",    "Johannes Brahms"),
            ("Franz Liszt",        "Franz Liszt"),
            ("Antonio Vivaldi",    "Antonio Vivaldi"),
            ("Pyotr Tchaikovsky",  "Pyotr Ilyich Tchaikovsky"),
            ("Richard Wagner",     "Richard Wagner"),
            ("Giacomo Puccini",    "Giacomo Puccini"),
            ("Claude Debussy",     "Claude Debussy"),
            ("Giuseppe Verdi",     "Giuseppe Verdi"),
            ("George Handel",      "George Frideric Handel"),
            ("Joseph Haydn",       "Joseph Haydn"),
            ("Robert Schumann",    "Robert Schumann"),
        ],
    },
    {
        "name": "Soccer Legends",
        "description": "The greatest footballers of all time — can you guess who's who?",
        "cover_index": 0,   # Pelé
        "characters": [
            ("Pele",               "Pelé"),
            ("Diego Maradona",     "Diego Maradona"),
            ("Ronaldo Nazario",    "Ronaldo (Brazilian footballer)"),
            ("Zinedine Zidane",    "Zinedine Zidane"),
            ("Johan Cruyff",       "Johan Cruyff"),
            ("Ronaldinho",         "Ronaldinho"),
            ("Thierry Henry",      "Thierry Henry"),
            ("Lionel Messi",       "Lionel Messi"),
            ("Cristiano Ronaldo",  "Cristiano Ronaldo"),
            ("Roberto Baggio",     "Roberto Baggio"),
            ("George Best",        "George Best"),
            ("Gerd Muller",        "Gerd Müller"),
            ("Marco van Basten",   "Marco van Basten"),
            ("Michel Platini",     "Michel Platini"),
            ("Rivaldo",            "Rivaldo"),
            ("Romario",            "Romário"),
        ],
    },
    {
        "name": "Famous Artists",
        "description": "Masters of paint and sculpture — do you know these creative geniuses?",
        "cover_index": 2,   # Vincent van Gogh
        "characters": [
            ("Leonardo da Vinci",  "Leonardo da Vinci"),
            ("Michelangelo",       "Michelangelo"),
            ("Vincent van Gogh",   "Vincent van Gogh"),
            ("Pablo Picasso",      "Pablo Picasso"),
            ("Rembrandt",          "Rembrandt"),
            ("Claude Monet",       "Claude Monet"),
            ("Salvador Dali",      "Salvador Dalí"),
            ("Frida Kahlo",        "Frida Kahlo"),
            ("Raphael",            "Raphael (painter)"),
            ("Jan Vermeer",        "Johannes Vermeer"),
            ("Francisco Goya",     "Francisco Goya"),
            ("Paul Cezanne",       "Paul Cézanne"),
            ("Edgar Degas",        "Edgar Degas"),
            ("Henri Matisse",      "Henri Matisse"),
            ("Auguste Renoir",     "Pierre-Auguste Renoir"),
            ("Andy Warhol",        "Andy Warhol"),
        ],
    },
    {
        "name": "Historical Leaders",
        "description": "From ancient generals to modern heroes — do you know these world-changers?",
        "cover_index": 4,   # Winston Churchill
        "characters": [
            ("Julius Caesar",        "Julius Caesar"),
            ("Napoleon Bonaparte",   "Napoleon"),
            ("Alexander the Great",  "Alexander the Great"),
            ("Cleopatra",            "Cleopatra"),
            ("Winston Churchill",    "Winston Churchill"),
            ("Mahatma Gandhi",       "Mahatma Gandhi"),
            ("Nelson Mandela",       "Nelson Mandela"),
            ("Martin Luther King",   "Martin Luther King Jr."),
            ("Queen Victoria",       "Queen Victoria"),
            ("Catherine the Great",  "Catherine the Great"),
            ("Genghis Khan",         "Genghis Khan"),
            ("Queen Elizabeth I",    "Elizabeth I"),
            ("Simon Bolivar",        "Simón Bolívar"),
            ("Charlemagne",          "Charlemagne"),
            ("Saladin",              "Saladin"),
            ("Mustafa Ataturk",      "Mustafa Kemal Atatürk"),
        ],
    },
    {
        "name": "Dinosaurs",
        "description": "Prehistoric giants — can you identify these ancient creatures?",
        "cover_index": 0,   # Tyrannosaurus
        "characters": [
            ("T. rex",               "Tyrannosaurus"),
            ("Triceratops",          "Triceratops"),
            ("Velociraptor",         "Velociraptor"),
            ("Brachiosaurus",        "Brachiosaurus"),
            ("Stegosaurus",          "Stegosaurus"),
            ("Spinosaurus",          "Spinosaurus"),
            ("Ankylosaurus",         "Ankylosaurus"),
            ("Pterodactylus",        "Pterodactylus"),
            ("Parasaurolophus",      "Parasaurolophus"),
            ("Diplodocus",           "Diplodocus"),
            ("Allosaurus",           "Allosaurus"),
            ("Pachycephalosaurus",   "Pachycephalosaurus"),
            ("Iguanodon",            "Iguanodon"),
            ("Carnotaurus",          "Carnotaurus"),
            ("Therizinosaurus",      "Therizinosaurus"),
            ("Mosasaurus",           "Mosasaurus"),
        ],
    },
    {
        "name": "NBA Legends",
        "description": "The greatest basketball players to ever play the game.",
        "cover_index": 0,   # Michael Jordan
        "characters": [
            ("Michael Jordan",     "Michael Jordan"),
            ("LeBron James",       "LeBron James"),
            ("Kobe Bryant",        "Kobe Bryant"),
            ("Magic Johnson",      "Magic Johnson"),
            ("Larry Bird",         "Larry Bird"),
            ("Kareem Abdul-Jabbar","Kareem Abdul-Jabbar"),
            ("Shaquille O'Neal",   "Shaquille O'Neal"),
            ("Tim Duncan",         "Tim Duncan"),
            ("Stephen Curry",      "Stephen Curry"),
            ("Kevin Durant",       "Kevin Durant"),
            ("Charles Barkley",    "Charles Barkley"),
            ("Allen Iverson",      "Allen Iverson"),
            ("Hakeem Olajuwon",    "Hakeem Olajuwon"),
            ("Dirk Nowitzki",      "Dirk Nowitzki"),
            ("Julius Erving",      "Julius Erving"),
            ("Wilt Chamberlain",   "Wilt Chamberlain"),
        ],
    },
    {
        "name": "World Flags",
        "description": "Can you match the flag to the country?",
        "cover_index": 0,
        "characters": [
            ("United States",      "Flag of the United States"),
            ("United Kingdom",     "Flag of the United Kingdom"),
            ("France",             "Flag of France"),
            ("Germany",            "Flag of Germany"),
            ("Japan",              "Flag of Japan"),
            ("Brazil",             "Flag of Brazil"),
            ("Canada",             "Flag of Canada"),
            ("Australia",          "Flag of Australia"),
            ("India",              "Flag of India"),
            ("China",              "Flag of China"),
            ("Mexico",             "Flag of Mexico"),
            ("Italy",              "Flag of Italy"),
            ("Spain",              "Flag of Spain"),
            ("Russia",             "Flag of Russia"),
            ("South Africa",       "Flag of South Africa"),
            ("Argentina",          "Flag of Argentina"),
        ],
    },
]


def safe_filename(name: str) -> str:
    """Strip characters that are invalid in filenames."""
    return re.sub(r'[\\/:*?"<>|]', "", name).strip()


def fetch_wiki_thumbnail(title: str) -> tuple[str, str] | None:
    """
    Returns (image_url, ext) for the Wikipedia article thumbnail, or None.
    """
    url = WIKI_API.format(urllib.parse.quote(title, safe=""))
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            import json
            data = json.loads(resp.read())
    except Exception as e:
        print(f"    Wikipedia API error for '{title}': {e}")
        return None

    src = data.get("thumbnail", {}).get("source", "")
    if not src:
        print(f"    No thumbnail for '{title}'")
        return None

    # Derive extension from URL, defaulting to .jpg
    path = src.split("?")[0]
    ext  = os.path.splitext(path)[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".jpg"

    return src, ext


def download_image(url: str, dest_path: str) -> bool:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        with open(dest_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"    Download error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="./sets", help="Output root directory")
    args = parser.parse_args()

    root = args.out
    os.makedirs(root, exist_ok=True)

    total_sets = 0
    total_chars = 0

    for set_def in SETS:
        set_name    = set_def["name"]
        cover_index = set_def["cover_index"]
        characters  = set_def["characters"]

        set_dir = os.path.join(root, safe_filename(set_name))
        os.makedirs(set_dir, exist_ok=True)

        print(f"\n{'='*60}")
        print(f"Set: {set_name}")
        print(f"{'='*60}")

        downloaded = 0

        for i, (display_name, wiki_title) in enumerate(characters):
            filename_base = safe_filename(display_name)

            result = fetch_wiki_thumbnail(wiki_title)
            time.sleep(DELAY)

            if result is None:
                continue

            img_url, ext = result
            dest = os.path.join(set_dir, filename_base + ext)

            if os.path.exists(dest):
                print(f"  ✓ {display_name} (cached)")
                downloaded += 1
            elif download_image(img_url, dest):
                print(f"  ✓ {display_name}")
                downloaded += 1
            else:
                print(f"  ✗ {display_name} — download failed")
                continue

            # Save cover image as a copy
            if i == cover_index:
                cover_dest = os.path.join(set_dir, "cover" + ext)
                if not os.path.exists(cover_dest):
                    import shutil
                    shutil.copy2(dest, cover_dest)
                print(f"    ^ saved as cover")

        # Fallback: if cover_index character failed, use first successful image
        cover_files = [f for f in os.listdir(set_dir) if f.startswith("cover.")]
        if not cover_files:
            candidates = [f for f in os.listdir(set_dir)
                          if not f.startswith("cover") and os.path.isfile(os.path.join(set_dir, f))]
            if candidates:
                import shutil
                src = os.path.join(set_dir, candidates[0])
                ext = os.path.splitext(candidates[0])[1]
                shutil.copy2(src, os.path.join(set_dir, "cover" + ext))
                print(f"  (used {candidates[0]} as fallback cover)")

        print(f"  → {downloaded}/{len(characters)} characters downloaded")
        total_sets  += 1
        total_chars += downloaded

    print(f"\n{'='*60}")
    print(f"Done. {total_sets} sets, {total_chars} images saved to '{root}/'")


if __name__ == "__main__":
    main()
