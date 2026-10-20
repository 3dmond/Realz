import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

GROW_PX = 6
SAMPLE_THRESHOLD = 15.0 / 255.0

Gimp.context_set_sample_threshold(SAMPLE_THRESHOLD)
Gimp.context_set_sample_transparent(False)

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
        Gimp.Selection.none(image)
        image.select_contiguous_color(Gimp.ChannelOps.REPLACE, layer, 0.0, 0.0)
        Gimp.Selection.grow(image, GROW_PX)
        layer.edit_clear()
        Gimp.Selection.none(image)
    finally:
        image.undo_group_end()
    processed_count += 1
    print(f"[Step 2] Cleared background on '{image.get_name()}' (Grow: {GROW_PX}px).")

Gimp.displays_flush()
print(f"[Step 2 Complete] Processed {processed_count} image(s).")