import sys

with open('/tmp/logo.b64', 'r') as f:
    b64_data = f.read().strip()

svg_template = f"""<svg width="64" height="64" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Filter to remove white background by mapping pure RGB(255,255,255) to alpha zero -->
    <filter id="remove-white">
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        -1 -1 -1 0 2.9
      "/>
    </filter>
  </defs>
  <image width="128" height="128" href="data:image/png;base64,{b64_data}" filter="url(#remove-white)"/>
</svg>
"""

with open('/home/viking/ThomassenPovoaHoldingAS/StormberryAS/GitHub/Website/favicon.svg', 'w') as f:
    f.write(svg_template)
print("SVG created successfully!")
