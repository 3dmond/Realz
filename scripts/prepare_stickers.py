exec('''
import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

TARGET_MAX_DIM = 512
GROW_PX = 6
SAMPLE_THRESHOLD = 15.0 / 255.0

pdb = Gimp.get_pdb()
bounds_proc = pdb.lookup_procedure('gimp-selection-bounds')

# Set interpolation globally in the context for all scale operations
Gimp.context_set_interpolation(Gimp.InterpolationType.NOHALO)

for image in Gimp.get_images():
    image.undo_group_start()
    try:
        layers = image.get_selected_layers()
        if not layers:
            layers = image.get_layers()
        if not layers:
            continue

        layer = layers[0]
        if not layer.has_alpha():
            layer.add_alpha()

        # Step 1 & 2: Background Selection & 6px Grow
        Gimp.context_set_sample_threshold(SAMPLE_THRESHOLD)
        Gimp.context_set_sample_transparent(False)
        Gimp.Selection.none(image)

        image.select_contiguous_color(Gimp.ChannelOps.REPLACE, layer, 0.0, 0.0)
        Gimp.Selection.grow(image, GROW_PX)
        layer.edit_clear()
        Gimp.Selection.none(image)

        # Step 3: Exact Bounding Box Autocrop
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

        # Step 4: Native Image Scale (Max 512px, NoHalo via context)
        w = image.get_width()
        h = image.get_height()
        max_side = max(w, h)

        if max_side > TARGET_MAX_DIM:
            factor = float(TARGET_MAX_DIM) / float(max_side)
            new_w = int(round(w * factor))
            new_h = int(round(h * factor))
            image.scale(new_w, new_h)

        for l in image.get_layers():
            if not l.is_floating_sel():
                l.resize_to_image_size()

        # Step 5: GEGL Unsharp Mask Commit
        filt = Gimp.DrawableFilter.new(layer, "gegl:unsharp-mask", "Sharpen")
        if filt:
            config = filt.get_config()
            if config:
                config.set_property('std-dev', 0.9)
                config.set_property('scale', 1.4)
                config.set_property('threshold', 0.0)
            filt.update()
            layer.merge_filter(filt)

    finally:
        image.undo_group_end()

Gimp.displays_flush()
print("Batch Processing Finished")
''')