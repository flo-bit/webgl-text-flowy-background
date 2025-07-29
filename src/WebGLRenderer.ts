import type { ColorConfiguration } from "./colorConfigurations";
import { colorConfigurations } from "./colorConfigurations";

const N_TIME_VALUES = 2;
function timeKey(index: number) {
  return index > 0 ? `u_time${index + 1}` : "u_time";
}

interface TimeState {
  seed: number;
  lastTime: number;
  elapsed: number;
  timeSpeed: number;
}

export class WebGLRenderer {
  readonly gl: WebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly positionBuffer: WebGLBuffer;
  readonly gradientTexture: WebGLTexture;
  readonly timeStates: TimeState[];
  readonly uniformLocations = new Map<string, WebGLUniformLocation>();

  constructor(
    canvas: HTMLCanvasElement,
    vertexSrc: string,
    fragmentSrc: string,
    config: ColorConfiguration,
    seed?: number,
  ) {
    const gl = canvas.getContext("webgl")!;
    this.gl = gl;
    this.program = WebGLRenderer.createProgram(gl, vertexSrc, fragmentSrc);
    this.positionBuffer = gl.createBuffer()!;
    this.gradientTexture = gl.createTexture()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    this.setPositions();

    seed = seed ?? Math.random() * 100_000;
    this.timeStates = Array(N_TIME_VALUES)
      .fill(0)
      .map(() => ({
        seed: seed,
        lastTime: Date.now(),
        elapsed: 0,
        timeSpeed: 1,
      }));
    this.setColorConfig(config);
    gl.useProgram(this.program);
  }

  private setPositions() {
    const gl = this.gl;
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
  }

  public setColorConfig(name: ColorConfiguration) {
    const gradient = colorConfigurations[name].gradient;
    WebGLRenderer.writeGradientToTexture(
      this.gl,
      gradient,
      this.gradientTexture,
      1000,
      2,
    );
  }

  public render() {
    const gl = this.gl;
    const now = Date.now();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);

    // update time uniforms
    this.timeStates.forEach((st, i) => {
      const dt = now - st.lastTime;
      st.elapsed += dt * st.timeSpeed;
      st.lastTime = now;
      gl.uniform1f(this.getLoc(timeKey(i)), st.seed + st.elapsed * 0.001);
    });

    gl.uniform1f(this.getLoc("u_w"), gl.canvas.width);
    gl.uniform1f(this.getLoc("u_h"), gl.canvas.height);

    // bind gradient
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.gradientTexture);
    gl.uniform1i(this.getLoc("u_gradient"), 0);

    gl.enableVertexAttribArray(
      gl.getAttribLocation(this.program, "a_position"),
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(
      gl.getAttribLocation(this.program, "a_position"),
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private getLoc(name: string) {
    if (!this.uniformLocations.has(name)) {
      this.uniformLocations.set(
        name,
        this.gl.getUniformLocation(this.program, name)!,
      );
    }
    return this.uniformLocations.get(name)!;
  }

  private static writeGradientToTexture(
    gl: WebGLRenderingContext,
    stops: string[],
    tex: WebGLTexture,
    w: number,
    h: number,
  ) {
    const cvs = document.createElement("canvas");
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private static createProgram(
    gl: WebGLRenderingContext,
    vs: string,
    fs: string,
  ) {
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s)!);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(prog)!);
    return prog;
  }
}
