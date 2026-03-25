import glob
import re

new_title = "<title>Stormberry A.S. | Smarter Sales, Global Culture, AI Strategy</title>"

for f in glob.glob("*.html"):
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    content = re.sub(r"<title>.*?</title>", new_title, content, flags=re.IGNORECASE)
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)
print("Global title tags updated.")
