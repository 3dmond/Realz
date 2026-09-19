import gi
gi.require_version('Gimp', '3.0')
from gi.repository import Gimp

pdb = Gimp.get_pdb()
autocrop_proc = pdb.lookup_procedure('plug-in-autocrop')
scale_proc = pdb.lookup_procedure('gimp-image-scale-full')

images = list(Gimp.get_images())

for image in images:
    image.undo_group_start()
    try:
        # 1. Alpha Channels
        for layer in image.get_selected_layers():
            if not layer.has_alpha():
                layer.add_alpha()

        # 2. Core Die-Cut Masking
        Gimp.context_set_sample_threshold(0.01)
        for layer in image.get_selected_layers():
            if layer.get_mask():
                continue
            image.select_contiguous_color(Gimp.ChannelOps.REPLACE, layer, 0.0, 0.0)
            Gimp.Selection.invert(image)
            Gimp.Selection.shrink(image, 11)
            mask = layer.create_mask(Gimp.AddMaskType.SELECTION)
            layer.add_mask(mask)
            Gimp.Selection.none(image)

            if layer.get_mask():
                layer.remove_mask(Gimp.MaskApplyMode.APPLY)

        # 3. Initial Autocrop Pass
        if autocrop_proc:
            for layer in image.get_selected_layers():
                config = autocrop_proc.create_config()
                config.set_property('run-mode', Gimp.RunMode.NONINTERACTIVE)
                config.set_property('image', image)
                config.set_property('drawable', layer)
                autocrop_proc.run(config)
                break

        # 4. Geometry Pipeline (Scale to 1000px, Center Canvas)
        width = image.get_width()
        height = image.get_height()
        max_side = max(width, height)

        if max_side > 1000 and scale_proc:
            scale_factor = 1000.0 / max_side
            new_width = int(round(width * scale_factor))
            new_height = int(round(height * scale_factor))
            config = scale_proc.create_config()
            config.set_property('image', image)
            config.set_property('width', new_width)
            config.set_property('height', new_height)
            config.set_property('interpolation', Gimp.InterpolationType.LANCZOS)
            scale_proc.run(config)

        current_w = image.get_width()
        current_h = image.get_height()
        target_size = 1000
        offset_x = (target_size - current_w) / 2.0
        offset_y = (target_size - current_h) / 2.0
        image.resize(target_size, target_size, int(offset_x), int(offset_y))

        for layer in image.get_layers():
            if not layer.is_floating_sel():
                layer.resize_to_image_size()

        # 5. GEGL Unsharp Mask Filter
        for layer in image.get_selected_layers():
            if layer.is_floating_sel():
                continue
            filt = Gimp.DrawableFilter.new(layer, "gegl:unsharp-mask", "Unsharp Mask")
            if filt:
                config = filt.get_config()
                if config:
                    config.set_property('std-dev', 1.5)
                    config.set_property('scale', 0.5)
                    config.set_property('threshold', 0.0)
                filt.update()
                layer.append_filter(filt)

    finally:
        image.undo_group_end()

Gimp.displays_flush()