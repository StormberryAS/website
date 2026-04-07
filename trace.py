import cv2
import numpy as np

# Load image
img = cv2.imread('/home/viking/ThomassenPovoaHoldingAS/StormberryAS/Logo/logo1 1x1 image.png')
img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

# Convert to HSV to better segment colors
hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

# Red has two ranges in HSV
lower_red1 = np.array([0, 50, 50])
upper_red1 = np.array([10, 255, 255])
lower_red2 = np.array([170, 50, 50])
upper_red2 = np.array([180, 255, 255])

mask_red1 = cv2.inRange(hsv, lower_red1, upper_red1)
mask_red2 = cv2.inRange(hsv, lower_red2, upper_red2)
mask_red = mask_red1 + mask_red2

# Blue range
lower_blue = np.array([100, 50, 50])
upper_blue = np.array([140, 255, 255])
mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

# Find median color for fill
red_pixels = img[mask_red > 0]
blue_pixels = img[mask_blue > 0]

red_color = np.median(red_pixels, axis=0) if len(red_pixels) > 0 else [0,0,0]
blue_color = np.median(blue_pixels, axis=0) if len(blue_pixels) > 0 else [0,0,0]

print(f"Red: #{int(red_color[0]):02x}{int(red_color[1]):02x}{int(red_color[2]):02x}")
print(f"Blue: #{int(blue_color[0]):02x}{int(blue_color[1]):02x}{int(blue_color[2]):02x}")

# Save the masks as PBM for potrace
cv2.imwrite('red.pbm', mask_red)
cv2.imwrite('blue.pbm', mask_blue)
