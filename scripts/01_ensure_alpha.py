import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

images = Gimp.get_images()
if not images:
    print("[Step 1] No open images found in GIMP.")
else:
    processed_count = 0
    for image in images:
        layers = image.get_selected_layers()
        if not layers:
            layers = image.get_layers()
        if not layers:
            print(f"[Step 1] Warning: Image '{image.get_name()}' has no layers.")
            continue
        layer = layers[0]
        if not layer.has_alpha():
            layer.add_alpha()
            print(f"[Step 1] Added Alpha Channel to '{layer.get_name()}' in image '{image.get_name()}'.")
        else:
            print(f"[Step 1] Alpha Channel already present on '{layer.get_name()}' in image '{image.get_name()}'.")
        processed_count += 1
    Gimp.displays_flush()
    print(f"[Step 1 Complete] Verified {processed_count} image(s). Ready for background removal.")