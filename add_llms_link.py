import os
import glob
import re

en_link = '    <link rel="alternate" type="text/markdown" href="https://stormberry.as/llms.txt" />\\n  </head>'
no_link = '    <link rel="alternate" type="text/markdown" href="https://stormberry.as/no-llms.txt" />\\n  </head>'

for file in glob.glob("*.html"):
    with open(file, "r") as f:
        content = f.read()
    if 'href="https://stormberry.as/llms.txt"' not in content:
        content = re.sub(r'</head>', en_link, content)
        with open(file, "w") as f:
            f.write(content)
        print(f"Updated {file}")

for file in glob.glob("no/*.html"):
    with open(file, "r") as f:
        content = f.read()
    if 'href="https://stormberry.as/no-llms.txt"' not in content:
        content = re.sub(r'</head>', no_link, content)
        with open(file, "w") as f:
            f.write(content)
        print(f"Updated {file}")
