import os
import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp
gi.require_version('Gio', '2.0')
from gi.repository import Gio

EXPORT_DIR = r" PATH "

os.makedirs(EXPORT_DIR, exist_ok=True)
images = Gimp.get_images()
exported_count = 0
for image in images:
    clean_name = image.get_name()
    for ext in ['.jpg', '.jpeg', '.png', '.webp', '.xcf']:
        idx = clean_name.lower().find(ext)
        if idx != -1:
            clean_name = clean_name[:idx]
            break
    clean_name = clean_name.strip('-_ ')
    filename = f"{clean_name}.png"
    filepath = os.path.join(EXPORT_DIR, filename)
    gfile = Gio.File.new_for_path(filepath)
    try:
        Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, gfile, None)
    except TypeError:
        Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, gfile)
    exported_count += 1
    print(f"[Exported PNG] '{filename}'")

print(f"Exported {exported_count} images to {EXPORT_DIR}")