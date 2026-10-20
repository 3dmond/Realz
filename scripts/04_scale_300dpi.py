import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

DPI = 300.0
PX_PER_CM = DPI / 2.54

# Target physical size for longest edge (5.0 cm = 50 mm standard)
TARGET_CM = 5.0
# Minimum threshold in cm to avoid unweedable/fragile cutouts
MIN_SHORT_CM = 3.9

target_max_px = int(round(TARGET_CM * PX_PER_CM))
min_short_px = int(round(MIN_SHORT_CM * PX_PER_CM))

Gimp.context_set_interpolation(Gimp.InterpolationType.NOHALO)

images = Gimp.get_images()
processed_count = 0
for image in images:
    image.undo_group_start()
    try:
        w = image.get_width()
        h = image.get_height()
        max_side = max(w, h)
        factor = float(target_max_px) / float(max_side)
        new_w = int(round(w * factor))
        new_h = int(round(h * factor))
        image.scale(new_w, new_h)
        for l in image.get_layers():
            if not l.is_floating_sel():
                l.resize_to_image_size()
        image.set_resolution(DPI, DPI)
        w_mm = (new_w / PX_PER_CM) * 10.0
        h_mm = (new_h / PX_PER_CM) * 10.0
        aspect = round(float(new_w) / float(new_h), 4)
        print(f"[Step 4] '{image.get_name()}': {w_mm:.1f} x {h_mm:.1f} mm ({new_w}x{new_h}px @ 300 DPI, aspect: {aspect})")
        if min(w_mm, h_mm) < (MIN_SHORT_CM * 10.0):
            print(f"  [!] WARNING: Short edge is {min(w_mm, h_mm):.1f} mm (< {MIN_SHORT_CM * 10.0:.1f} mm threshold). Consider setting TARGET_CM to 6.5 or 7.0.")
    finally:
        image.undo_group_end()
    processed_count += 1

Gimp.displays_flush()
print(f"[Step 4 Complete] Scaled and tagged {processed_count} image(s) at 300 DPI.")