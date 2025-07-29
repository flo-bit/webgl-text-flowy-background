import { WebGLRenderer } from "./WebGLRenderer";
import createFragmentShader from "./fragment";
import type { ColorConfiguration } from "./colorConfigurations";

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
const parent = canvas.parentElement;

function resize() {
	canvas.width  = parent!.clientWidth;
	canvas.height = parent!.clientHeight;
}
window.addEventListener("resize", resize);
resize();

const fsModule = createFragmentShader({});
const fragmentSrc = fsModule.shader;

// choose your color preset here:
const preset: ColorConfiguration = "blue_to_yellow";

const renderer = new WebGLRenderer(canvas, `precision mediump float;
attribute vec2 a_position;

void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
}`, fragmentSrc, preset);

tick();
function tick() {
  requestAnimationFrame(tick);
  renderer.render();
}
