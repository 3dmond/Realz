import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

pdb = Gimp.get_pdb()
bounds_proc = pdb.lookup_procedure('gimp-selection-bounds')

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
        image.select_item(Gimp.ChannelOps.REPLACE, layer)
        cfg = bounds_proc.create_config()
        cfg.set_property('image', image)
        val = bounds_proc.run(cfg)
        non_empty = val.index(1)
        x1 = val.index(2)
        y1 = val.index(3)
        x2 = val.index(4)
        y2 = val.index(5)
        Gimp.Selection.none(image)
        if non_empty:
            crop_w = int(x2 - x1)
            crop_h = int(y2 - y1)
            image.crop(crop_w, crop_h, int(x1), int(y1))
            print(f"[Step 3] Cropped '{image.get_name()}' to {crop_w}x{crop_h}px.")
    finally:
        image.undo_group_end()
    processed_count += 1

Gimp.displays_flush()
print(f"[Step 3 Complete] Autocropped {processed_count} image(s).")