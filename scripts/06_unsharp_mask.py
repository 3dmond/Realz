import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

STD_DEV = 0.9
SCALE = 1.4
THRESHOLD = 0.0

images = Gimp.get_images()
processed_count = 0
for image in images:
    layers = image.get_selected_layers()
    if not layers:
        layers = image.get_layers()
    if not layers:
        continue
    layer = layers[0]
    image.undo_group_start()
    try:
        filt = Gimp.DrawableFilter.new(layer, "gegl:unsharp-mask", "Sharpen")
        if filt:
            config = filt.get_config()
            if config:
                config.set_property('std-dev', STD_DEV)
                config.set_property('scale', SCALE)
                config.set_property('threshold', THRESHOLD)
            filt.update()
            layer.merge_filter(filt)
            print(f"[Step 5] Sharpened '{image.get_name()}' (Radius: {STD_DEV}, Scale: {SCALE}).")
    finally:
        image.undo_group_end()
    processed_count += 1

Gimp.displays_flush()
print(f"[Step 5 Complete] Finalized and sharpened {processed_count} image(s).")