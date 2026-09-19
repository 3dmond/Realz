"""
GIMP 3.0 Sticker Preparation Script
-----------------------------------
Automated batch processing pipeline for sticker artwork in GIMP 3.0:

Phase 1: Initial Extraction & Die-Cut Masking
  - Ensures alpha channel on all selected layers
  - Fuzzy selection & die-cut masking (sample threshold 0.01, shrink 11px, feather 3px, bake cut)
  - Initial autocrop pass
  - Allows manual refinement before running Phase 2

Phase 2: Geometry Scaling, Sharpening & WebP Batch Export
  - Geometry pipeline: Lanczos downscaling to max 1000px, 1000x1000 centered canvas, resize layer
  - GEGL unsharp mask filter (std-dev: 1.5, scale: 0.5, threshold: 0.0)
  - Lossless WebP batch export
"""

import os
import sys
import gi

gi.require_version('Gimp', '3.0')
from gi.repository import Gimp, Gio


# ==============================================================================
# PHASE 1: Initial Extraction & Core Die-Cut Masking
# ==============================================================================

def initial_extraction():
    """
    Phase 1: Alpha channel addition, core die-cut masking, and initial autocrop pass.
    Allows manual refinement before running Phase 2.
    """
    image_list = Gimp.get_images()
    processed_count = 0

    # 1. Alpha Channels
    for image in image_list:
        for layer in image.get_selected_layers():
            if not layer.has_alpha():
                layer.add_alpha()
        processed_count += 1

    # 2. Core Die-Cut Masking (Fuzzy Select -> Shrink 11px -> Feather 3px -> Bake)
    _ = Gimp.context_set_sample_threshold(0.01)

    for image in image_list:
        for layer in image.get_selected_layers():
            if layer.get_mask():
                continue
            _ = image.select_contiguous_color(Gimp.ChannelOps.REPLACE, layer, 0.0, 0.0)
            _ = Gimp.Selection.invert(image)
            _ = Gimp.Selection.shrink(image, 11)
            _ = Gimp.Selection.feather(image, 3)
            mask = layer.create_mask(Gimp.AddMaskType.SELECTION)
            _ = layer.add_mask(mask)
            _ = Gimp.Selection.none(image)
            
            # Immediately bake the cut into the layer pixels
            if layer.get_mask():
                layer.remove_mask(Gimp.MaskApplyMode.APPLY)
            processed_count += 1

    # 3. Initial Autocrop Pass
    pdb = Gimp.get_pdb()
    for image in Gimp.get_images():
        autocrop_proc = pdb.lookup_procedure('plug-in-autocrop')
        if autocrop_proc:
            for layer in image.get_selected_layers():
                config = autocrop_proc.create_config()
                config.set_property('run-mode', Gimp.RunMode.NONINTERACTIVE)
                config.set_property('image', image)
                config.set_property('drawable', layer)
                autocrop_proc.run(config)
                break

    Gimp.displays_flush()
    print(f"Success: Initial extraction and 11px cut complete on {processed_count} layers. Perform your manual refinement now.")


# ==============================================================================
# PHASE 2: Geometry Scaling, Sharpening & Lossless WebP Batch Export
# ==============================================================================

def finalize_and_export(output_dir=r"C:\Users\edmon\Downloads\Stickers\24082026_2\a.a"):
    """
    Phase 2: Geometry pipeline (Lanczos scale to 1000px, 1000x1000 canvas center),
    GEGL Unsharp Mask filter, and lossless WebP batch export.
    """
    pdb = Gimp.get_pdb()

    # 1. Geometry Pipeline (Lanczos Scale to 1000px, Center Canvas)
    for image in Gimp.get_images():
        width = image.get_width()
        height = image.get_height()
        max_side = max(width, height)
        
        if max_side > 1000:
            scale_factor = 1000.0 / max_side
            new_width = int(round(width * scale_factor))
            new_height = int(round(height * scale_factor))
            scale_proc = pdb.lookup_procedure('gimp-image-scale-full')
            if scale_proc:
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
            if layer.is_floating_sel():
                continue
            layer.resize_to_image_size()

    # 2. GEGL Unsharp Mask Filter
    for image in Gimp.get_images():
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

    # 3. Final Lossless WebP Batch Export
    os.makedirs(output_dir, exist_ok=True)

    for idx, image in enumerate(Gimp.get_images()):
        file_path = os.path.join(output_dir, f"sticker_{idx + 1}.webp")
        file_obj = Gio.File.new_for_path(file_path)
        Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, file_obj, None)
        print(f"Exported: {file_path}")

    Gimp.displays_flush()
    print("Success: Final geometry scaling, sharpening, and WebP batch export complete.")


# ==============================================================================
# Execution Entrypoint
# ==============================================================================

if __name__ == "__main__":
    # Allows executing phases individually:
    #   python prepare_stickers.py 1  -> Phase 1 only (Initial extraction & die-cut)
    #   python prepare_stickers.py 2  -> Phase 2 only (Geometry, sharpening & WebP export)
    #   python prepare_stickers.py    -> Runs full pipeline (Phase 1 followed by Phase 2)
    if len(sys.argv) > 1 and sys.argv[1] == "1":
        initial_extraction()
    elif len(sys.argv) > 1 and sys.argv[1] == "2":
        finalize_and_export()
    else:
        initial_extraction()
        finalize_and_export()
