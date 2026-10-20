import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

BLACK_POINT = 0.020
WHITE_POINT = 0.980
CHROMA_BOOST = 8.0

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
        filt_levels = Gimp.DrawableFilter.new(layer, "gegl:levels", "Batch Levels")
        if filt_levels:
            cfg = filt_levels.get_config()
            if cfg:
                cfg.set_property('in-low', BLACK_POINT)
                cfg.set_property('in-high', WHITE_POINT)
            filt_levels.update()
            layer.merge_filter(filt_levels)
        filt_chroma = Gimp.DrawableFilter.new(layer, "gegl:hue-chroma", "Batch Vibrancy")
        if filt_chroma:
            cfg_c = filt_chroma.get_config()
            if cfg_c:
                cfg_c.set_property('chroma', CHROMA_BOOST)
            filt_chroma.update()
            layer.merge_filter(filt_chroma)
        print(f"[Step 4.5] Polished '{image.get_name()}' (Safe Studio Profile).")
    finally:
        image.undo_group_end()
    processed_count += 1

Gimp.displays_flush()
print(f"[Step 4.5 Complete] Successfully enhanced {processed_count} image(s) with studio batch calibration.")