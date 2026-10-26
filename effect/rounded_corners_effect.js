/** @file Binds the actual corner rounding shader to the windows. */
var _a;
import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import { overview } from 'resource:///org/gnome/shell/ui/main.js';
import { readShader } from '../utils/file.js';
import { getPref } from '../utils/settings.js';
const [declarations, code] = readShader(import.meta.url, 'shader/rounded_corners.frag');
class Uniforms {
    bounds = 0;
    clipRadius = 0;
    borderWidth = 0;
    borderColor = 0;
    borderedAreaBounds = 0;
    borderedAreaClipRadius = 0;
    exponent = 0;
    pixelStep = 0;
}
export const RoundedCornersEffect = GObject.registerClass({}, class Effect extends Shell.GLSLEffect {
    /**
     * To store a uniform value, we need to know its location in the shader,
     * which is done by calling `this.get_uniform_location()`. This is
     * expensive, so we cache the location of uniforms when the shader is
     * created.
     */
    static uniforms = new Uniforms();
    constructor() {
        super();
        for (const k in Effect.uniforms) {
            Effect.uniforms[k] =
                this.get_uniform_location(k);
        }
    }
    vfunc_build_pipeline() {
        this.add_glsl_snippet(Cogl.SnippetHook.FRAGMENT, declarations, code, false);
    }
    /**
     * The window is painted into a full-size offscreen texture, which the
     * overview previews then scale down. Without mipmaps that downscaling
     * drops pixels and makes text unreadable, so enable them in the overview.
     */
    vfunc_paint_target(node, ctx) {
        const minFilter = overview.visible
            ? Cogl.PipelineFilter.LINEAR_MIPMAP_LINEAR
            : Cogl.PipelineFilter.LINEAR;
        this.get_pipeline()?.set_layer_filters(0, minFilter, Cogl.PipelineFilter.LINEAR);
        super.vfunc_paint_target(node, ctx);
    }
    /**
     * Update uniforms of the shader.
     * For more information, see the comments in the shader file.
     *
     * @param scaleFactor - Desktop scaling factor
     * @param config - Rounded corners configuration
     * @param windowBounds - Bounds of the window without padding
     */
    updateUniforms(scaleFactor, config, windowBounds) {
        const cut = getPref('border-mode') === 'cut';
        let borderWidth = getPref('border-width');
        // Outer (negative) borders have nothing to cut, so cut mode ignores them.
        if (cut) {
            borderWidth = Math.max(0, borderWidth);
        }
        borderWidth *= scaleFactor;
        const borderColor = config.borderColor;
        const outerRadius = config.borderRadius * scaleFactor;
        const { padding, smoothing } = config;
        let bounds = [
            windowBounds.x1 + padding.left * scaleFactor,
            windowBounds.y1 + padding.top * scaleFactor,
            windowBounds.x2 - padding.right * scaleFactor,
            windowBounds.y2 - padding.bottom * scaleFactor,
        ];
        let borderedAreaBounds = [
            bounds[0] + borderWidth,
            bounds[1] + borderWidth,
            bounds[2] - borderWidth,
            bounds[3] - borderWidth,
        ];
        let borderedAreaRadius = outerRadius - borderWidth;
        if (borderedAreaRadius < 0.001) {
            borderedAreaRadius = 0.0;
        }
        const pixelStep = [
            1 / this.actor.get_width(),
            1 / this.actor.get_height(),
        ];
        // This is needed for squircle corners
        let exponent = smoothing * 10 + 2;
        let radius = outerRadius * 0.5 * exponent;
        const maxRadius = Math.min(bounds[2] - bounds[0], bounds[3] - bounds[1]);
        if (radius > maxRadius) {
            exponent *= maxRadius / radius;
            radius = maxRadius;
        }
        if (outerRadius > 0) {
            borderedAreaRadius *= radius / outerRadius;
        }
        if (cut) {
            // Cut mode: the area inside the border becomes the window itself,
            // so the border strip is clipped away instead of painted.
            bounds = borderedAreaBounds;
            radius = borderedAreaRadius;
            borderWidth = 0;
            borderedAreaBounds = bounds;
        }
        this.#setUniforms(bounds, radius, borderWidth, borderColor, borderedAreaBounds, borderedAreaRadius, pixelStep, exponent);
    }
    #setUniforms(bounds, radius, borderWidth, borderColor, borderedAreaBounds, borderedAreaRadius, pixelStep, exponent) {
        const uniforms = Effect.uniforms;
        this.set_uniform_float(uniforms.bounds, 4, bounds);
        this.set_uniform_float(uniforms.clipRadius, 1, [radius]);
        this.set_uniform_float(uniforms.borderWidth, 1, [borderWidth]);
        this.set_uniform_float(uniforms.borderColor, 4, borderColor);
        this.set_uniform_float(uniforms.borderedAreaBounds, 4, borderedAreaBounds);
        this.set_uniform_float(uniforms.borderedAreaClipRadius, 1, [
            borderedAreaRadius,
        ]);
        this.set_uniform_float(uniforms.pixelStep, 2, pixelStep);
        this.set_uniform_float(uniforms.exponent, 1, [exponent]);
        this.queue_repaint();
    }
});
