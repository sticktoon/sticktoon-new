import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math

size = 800
r = size / 2.0
c = r

# Create RGBA image with white/transparent background
im = Image.new("RGBA", (size, size), (255, 255, 255, 0))

# 1. Base circular canvas
base_mask = Image.new("L", (size, size), 0)
d_base = ImageDraw.Draw(base_mask)
d_base.ellipse([0, 0, size, size], fill=255)

# Fill base white inside circle
base_bg = Image.new("RGBA", (size, size), (255, 255, 255, 255))
im.paste(base_bg, (0, 0), base_mask)

# 2. Dome falloff (radial gradient toward rim)
dome_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
# Create radial gradient array
y, x = np.ogrid[:size, :size]
dist_from_center = np.sqrt((x - c)**2 + (y - c)**2)
norm_dist = dist_from_center / r

# Alpha mapping like Canvas:
# 0 to 0.55 -> 0
# 0.55 to 0.62 -> 0 to 0.10
# 0.62 to 0.90 -> 0.10 to 0.30
# 0.90 to 1.0 -> 0.30 to 0.55
alpha_dome = np.zeros((size, size), dtype=np.float32)
mask1 = (norm_dist >= 0.55) & (norm_dist < 0.62)
alpha_dome[mask1] = (norm_dist[mask1] - 0.55) / (0.62 - 0.55) * 0.10

mask2 = (norm_dist >= 0.62) & (norm_dist < 0.90)
alpha_dome[mask2] = 0.10 + (norm_dist[mask2] - 0.62) / (0.90 - 0.62) * 0.20

mask3 = (norm_dist >= 0.90) & (norm_dist <= 1.0)
alpha_dome[mask3] = 0.30 + (norm_dist[mask3] - 0.90) / (1.0 - 0.90) * 0.25

alpha_dome[norm_dist > 1.0] = 0

dome_arr = np.zeros((size, size, 4), dtype=np.uint8)
dome_arr[:, :, 3] = (alpha_dome * 255).astype(np.uint8)
dome_img = Image.fromarray(dome_arr, "RGBA")
im = Image.alpha_composite(im, dome_img)

# 3. Soft sheen gradient across top
sheen_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
y_arr = np.tile(np.arange(size)[:, None], (1, size)) / float(size)
alpha_sheen = np.zeros((size, size), dtype=np.float32)
s_mask1 = y_arr <= 0.42
alpha_sheen[s_mask1] = 0.34 - (y_arr[s_mask1] / 0.42) * (0.34 - 0.05)
s_mask2 = (y_arr > 0.42) & (y_arr <= 1.0)
alpha_sheen[s_mask2] = 0.05 - ((y_arr[s_mask2] - 0.42) / 0.58) * 0.05

sheen_arr = np.zeros((size, size, 4), dtype=np.uint8)
sheen_arr[:, :, 0] = 255
sheen_arr[:, :, 1] = 255
sheen_arr[:, :, 2] = 255
sheen_arr[:, :, 3] = (alpha_sheen * 255 * (norm_dist <= 1.0)).astype(np.uint8)
sheen_img = Image.fromarray(sheen_arr, "RGBA")
im = Image.alpha_composite(im, sheen_img)

# 4. Specular Hotspot
hotspot = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d_hot = ImageDraw.Draw(hotspot)
# Ellipse rotated
hx, hy = c - r * 0.30, c - r * 0.40
hr = r * 0.46
# Draw hotspot radial gradient
hy_grid, hx_grid = np.ogrid[:size, :size]
# Rotate coords by +0.5 rad (~28.6 deg)
cos_a, sin_a = math.cos(0.5), math.sin(0.5)
dx = hx_grid - hx
dy = hy_grid - hy
rx = dx * cos_a + dy * sin_a
ry = -dx * sin_a + dy * cos_a
# Scale y by 1/0.55
h_dist = np.sqrt(rx**2 + (ry / 0.55)**2) / hr
alpha_hot = np.zeros((size, size), dtype=np.float32)
h_m1 = h_dist <= 0.5
alpha_hot[h_m1] = 0.62 - (h_dist[h_m1] / 0.5) * (0.62 - 0.16)
h_m2 = (h_dist > 0.5) & (h_dist <= 1.0)
alpha_hot[h_m2] = 0.16 - ((h_dist[h_m2] - 0.5) / 0.5) * 0.16

hot_arr = np.zeros((size, size, 4), dtype=np.uint8)
hot_arr[:, :, 0] = 255
hot_arr[:, :, 1] = 255
hot_arr[:, :, 2] = 255
hot_arr[:, :, 3] = (alpha_hot * 255 * (norm_dist <= 1.0)).astype(np.uint8)
hot_img = Image.fromarray(hot_arr, "RGBA")
im = Image.alpha_composite(im, hot_img)

# 5. Glossy Rim Stroke
rim_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d_rim = ImageDraw.Draw(rim_img)
d_rim.ellipse([2, 2, size - 2, size - 2], outline=(200, 200, 200, 200), width=6)
im = Image.alpha_composite(im, rim_img)

# Clip final output to circle
final_mask = Image.new("L", (size, size), 0)
ImageDraw.Draw(final_mask).ellipse([0, 0, size, size], fill=255)
r_ch, g_ch, b_ch, a_ch = im.split()
a_ch = ImageChops.multiply(a_ch, final_mask)
im.putalpha(a_ch)

output_path = r"F:\Anish Projects\sticktoon-new\public\customize-canvas-preview.png"
im.save(output_path, "PNG")
print("Saved canvas preview image to:", output_path)
