/*!
 * Glass helix, the decoration of the closing CTA. Ported from "WebGL Xylophone" by Sujen Phea
 * (https://github.com/Sujenphea/xylophone).
 *
 * MIT License. Copyright (c) 2009 - 2026 Codrops (https://codrops.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * Kept from the demo: frosted glass capsules on a helix, each turning slowly in place, their
 * colour drifting as they turn. Dropped: the scroll conveyor, the hover fluid, the strike swing
 * and the sound (it isn't interactive); three.js and the post-processing (one instanced draw in
 * plain WebGL 2, the capsule built in code); the blurred backdrop render (the glass takes the
 * colour painted behind the canvas); and the chrome: the demo's mirrored floor and rainbow
 * banding gave way to matte frosted glass with a soft film of the brand's warm tones. Only a
 * window from the middle of the demo's 64-capsule helix is drawn, its ends fading out, sized to
 * sit inside its canvas whatever the capsules' turn. It starts when the canvas nears the screen,
 * draws only while on screen, holds one still frame under reduced motion or without a GPU, and
 * leaves the canvas empty where WebGL 2 is missing.
 */

const SPIN_SPEED = 0.3; // radians a second each capsule turns: one full turn in about 21 s
const START = 4; // seconds into the turn to start from; also the still frame (reduced motion, no GPU)
const PAD = 24; // px kept clear round the helix inside its canvas
const DESKTOP_SCALE = 1.2;
const DESKTOP_PRESENCE = 1.12;
const MAX_DPR = 2;
const MAX_STEP = 1 / 20; // longest frame step, so a stalled frame doesn't jump the turn

// The demo's helix: capsule i sits on a circle of radius 1, a capsule's height above the last,
// 0.175 rad further round, tangent to the circle and tipped back so the steps follow the climb.
const HELIX = 64;
const BARS = 20; // drawn, from the middle of the helix
const FIRST = (HELIX - BARS) / 2;
const FADE = 5; // capsules over which each end fades out
const RADIUS = 1;
const PITCH = 0.4; // the capsule's height
const THETA_STEP = 0.175;
const TILT = Math.atan2(PITCH, RADIUS * 2);
const CAMERA_Z = 5;
const TURN_Z = 45; // degrees; a soft diagonal rather than a rigid horizontal or upright axis

// The capsule: 2.5 long, an oval section 0.2 across the helix and 0.4 along it.
const CAP_RADIUS = 0.2;
const CAP_HALF = 1.05; // half the straight part
const CAP_SQUASH = 0.5;
const SEGMENTS = 24; // around the capsule
const CAP_RINGS = 6; // per rounded end

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const glsl = (n: number) => n.toFixed(6);

/* -------------------------------------------------------------------------- */
/*                                   shaders                                  */
/* -------------------------------------------------------------------------- */
const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

uniform mat4 u_model;
uniform mat4 u_projection;
uniform float u_spin; // radians every capsule has turned about its own vertical axis

out vec3 vNormal;
out vec3 vWorldPos;
out float vFade;

const float PI = 3.141592653589793;
const vec3 CAMERA = vec3(0.0, 0.0, ${glsl(CAMERA_Z)});

vec3 rotate(vec3 v, vec4 q) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec4 qmul(vec4 a, vec4 b) {
  return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz));
}

void main() {
  float i = float(gl_InstanceID);
  float s = i + ${glsl(FIRST)};
  float theta = s * ${glsl(THETA_STEP)} + PI;
  vec3 slot = vec3(cos(theta), 0.0, sin(theta)) * ${glsl(RADIUS)};
  slot.y = (s - ${glsl((HELIX - 1) / 2)}) * ${glsl(PITCH)};

  // Euler (TILT, -theta, 0) in YXZ order, then the shared spin about Y
  vec2 h = vec2(${glsl(TILT)}, -theta) * 0.5;
  vec4 pose = vec4(sin(h.x) * cos(h.y), cos(h.x) * sin(h.y), -sin(h.x) * sin(h.y), cos(h.x) * cos(h.y));
  vec4 rot = qmul(vec4(0.0, sin(u_spin * 0.5), 0.0, cos(u_spin * 0.5)), pose);

  vec4 world = u_model * vec4(slot + rotate(position, rot), 1.0);
  gl_Position = u_projection * vec4(world.xyz - CAMERA, 1.0);

  vWorldPos = world.xyz;
  vNormal = mat3(u_model) * rotate(normal, rot);
  vFade = smoothstep(0.0, ${glsl(FADE)}, i + 0.5) * smoothstep(0.0, ${glsl(FADE)}, ${glsl(BARS)} - i - 0.5);
}`;

// Matte frosted glass, worked in linear light and written out as sRGB, premultiplied by the fade.
const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec3 u_backdrop; // the colour painted behind the canvas, sRGB
uniform float u_presence; // a restrained desktop lift to depth and pearl colour

in vec3 vNormal;
in vec3 vWorldPos;
in float vFade;

out vec4 outColor;

const float PI = 3.141592653589793;
const vec3 CAMERA = vec3(0.0, 0.0, ${glsl(CAMERA_Z)});
const float SHADE = 0.18; // the underside this much darker than the top
const float FILM = 0.9; // how far the film colour tints the glass, at the edge
const float FILM_CYCLES = 1.2; // colour bands across the capsule: few, so they read as areas
const float MILK = 0.35; // the silhouette frosts toward white rather than mirroring a floor

vec3 toLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// thin-film tint in warm pearl: peach -> rose -> lilac -> pearl, as linear-light multipliers
vec3 film(float t) {
  vec3 base = vec3(0.915, 0.765, 0.848);
  vec3 swing = vec3(0.124, 0.117, 0.219);
  return base + swing * cos(2.0 * PI * (t + vec3(-0.088, 0.194, 0.403)));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(CAMERA - vWorldPos);
  float edge = clamp(1.0 - dot(N, V), 0.0, 1.0);

  vec3 color = toLinear(u_backdrop) * (1.0 - SHADE * u_presence * (0.5 - 0.5 * N.y));
  // the film follows the surface's angle, so its colours drift as the capsules turn
  vec3 tint = film(edge * FILM_CYCLES + N.y * 0.35 + N.x * 0.25);
  color *= mix(vec3(1.0), tint, min(FILM * u_presence * (0.6 + 0.4 * edge), 1.0));
  color = mix(color, vec3(1.0), pow(edge, 4.0) * MILK);

  outColor = vec4(toSrgb(color) * vFade, vFade);
}`;

/* -------------------------------------------------------------------------- */
/*                                  geometry                                  */
/* -------------------------------------------------------------------------- */
type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

/** The capsule as position + normal pairs, wound counter-clockwise from outside. */
function capsule() {
  const rings: [z: number, r: number, nz: number, nr: number][] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i <= CAP_RINGS; i++) {
      const phi = ((side < 0 ? i - CAP_RINGS : i) / CAP_RINGS) * (Math.PI / 2);
      rings.push([
        side * CAP_HALF + CAP_RADIUS * Math.sin(phi),
        CAP_RADIUS * Math.cos(phi),
        Math.sin(phi),
        Math.cos(phi),
      ]);
    }
  }

  const vertices: number[] = [];
  for (const [z, r, nz, nr] of rings) {
    for (let j = 0; j <= SEGMENTS; j++) {
      const a = (j / SEGMENTS) * Math.PI * 2;
      const nx = (nr * Math.cos(a)) / CAP_SQUASH;
      const ny = nr * Math.sin(a);
      const length = Math.hypot(nx, ny, nz) || 1;
      vertices.push(
        CAP_SQUASH * r * Math.cos(a),
        r * Math.sin(a),
        z,
        nx / length,
        ny / length,
        nz / length,
      );
    }
  }

  const indices: number[] = [];
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = ring * (SEGMENTS + 1) + j;
      const b = a + SEGMENTS + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

/** The demo's group: scale 0.5, turned 25° about X and TURN_Z about Z (Euler XYZ), column-major. */
function modelMatrix() {
  const scale = 0.5;
  const [cx, sx] = [Math.cos((25 * Math.PI) / 180), Math.sin((25 * Math.PI) / 180)];
  const [cz, sz] = [Math.cos((TURN_Z * Math.PI) / 180), Math.sin((TURN_Z * Math.PI) / 180)];
  // prettier-ignore
  return new Float32Array([
    cz * scale, cx * sz * scale, sx * sz * scale, 0,
    -sz * scale, cx * cz * scale, sx * cz * scale, 0,
    0, -sx * scale, cx * scale, 0,
    0, 0, 0, 1,
  ]);
}

function qmul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + b[3] * a[0] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] + b[3] * a[1] + a[2] * b[0] - a[0] * b[2],
    a[3] * b[2] + b[3] * a[2] + a[0] * b[1] - a[1] * b[0],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

function rotate(v: Vec3, [x, y, z, w]: Quat): Vec3 {
  const t: Vec3 = [
    y * v[2] - z * v[1] + w * v[0],
    z * v[0] - x * v[2] + w * v[1],
    x * v[1] - y * v[0] + w * v[2],
  ];
  return [
    v[0] + 2 * (y * t[2] - z * t[1]),
    v[1] + 2 * (z * t[0] - x * t[2]),
    v[2] + 2 * (x * t[1] - y * t[0]),
  ];
}

const smoothstep = (edge: number, x: number) => {
  const t = Math.min(Math.max(x / edge, 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Where the helix falls as the camera sees it, over a whole turn of the capsules: the bounds of
 * x/depth and y/depth for the bounding-box corners of every capsule that isn't mostly faded. The vertex
 * shader's layout, repeated on the CPU.
 */
function outline() {
  const model = modelMatrix();
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const corners: Vec3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        corners.push([x * CAP_RADIUS * CAP_SQUASH, y * CAP_RADIUS, z * (CAP_HALF + CAP_RADIUS)]);
      }

  for (let i = 0; i < BARS; i++) {
    if (smoothstep(FADE, i + 0.5) * smoothstep(FADE, BARS - i - 0.5) < 0.25) continue;
    const s = i + FIRST;
    const theta = s * THETA_STEP + Math.PI;
    const slot: Vec3 = [
      RADIUS * Math.cos(theta),
      (s - (HELIX - 1) / 2) * PITCH,
      RADIUS * Math.sin(theta),
    ];
    const [hx, hy] = [TILT / 2, -theta / 2];
    const pose: Quat = [
      Math.sin(hx) * Math.cos(hy),
      Math.cos(hx) * Math.sin(hy),
      -Math.sin(hx) * Math.sin(hy),
      Math.cos(hx) * Math.cos(hy),
    ];

    for (let step = 0; step < 32; step++) {
      const half = (step / 32) * Math.PI;
      const rot = qmul([0, Math.sin(half), 0, Math.cos(half)], pose);
      for (const corner of corners) {
        const local = rotate(corner, rot);
        const [px, py, pz] = [slot[0] + local[0], slot[1] + local[1], slot[2] + local[2]];
        const x = model[0] * px + model[4] * py + model[8] * pz;
        const y = model[1] * px + model[5] * py + model[9] * pz;
        const depth = CAMERA_Z - (model[2] * px + model[6] * py + model[10] * pz);
        bounds.minX = Math.min(bounds.minX, x / depth);
        bounds.maxX = Math.max(bounds.maxX, x / depth);
        bounds.minY = Math.min(bounds.minY, y / depth);
        bounds.maxY = Math.max(bounds.maxY, y / depth);
      }
    }
  }
  return bounds;
}

/** A perspective that fits the helix's outline inside a canvas of this size, PAD clear, centred. */
function projection(bounds: ReturnType<typeof outline>, width: number, height: number, scale = 1) {
  const near = 0.1;
  const far = 200;
  const aspect = width / height;
  const room = (size: number) => Math.max(2 - (4 * PAD) / size, 0.1); // NDC span minus the padding
  const f =
    Math.min(
      room(height) / (bounds.maxY - bounds.minY),
      (aspect * room(width)) / (bounds.maxX - bounds.minX),
    ) * scale;
  // lens shift: slide the outline's centre to the canvas centre without turning the camera
  const shiftX = (-f / aspect) * ((bounds.minX + bounds.maxX) / 2);
  const shiftY = -f * ((bounds.minY + bounds.maxY) / 2);
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    -shiftX, -shiftY, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

/** The colour painted behind an element: its nearest ancestor background that isn't clear. */
function backdropColor(element: HTMLElement): Vec3 {
  for (let node = element.parentElement; node; node = node.parentElement) {
    // "rgb(252, 248, 244)" or "rgba(0, 0, 0, 0)"
    const channels = getComputedStyle(node)
      .backgroundColor.match(/[\d.]+/g)
      ?.map(Number);
    if (channels && channels.length >= 3 && channels[3] !== 0) {
      return [channels[0] / 255, channels[1] / 255, channels[2] / 255];
    }
  }
  return [1, 1, 1];
}

/**
 * Whether WebGL runs on the CPU (no GPU, or a blocklisted one). Every frame then blocks the page;
 * on a phone that adds up to seconds. Chrome names its renderer only through the debug extension.
 */
function softwareRendered(gl: WebGL2RenderingContext): boolean {
  let renderer = String(gl.getParameter(gl.RENDERER));
  if (renderer === 'WebKit WebGL') {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}

/* -------------------------------------------------------------------------- */
/*                                    main                                    */
/* -------------------------------------------------------------------------- */
function mount(canvas: HTMLCanvasElement) {
  const bounds = outline();
  let gl: WebGL2RenderingContext | null = null;
  let uniforms: Record<
    'model' | 'projection' | 'spin' | 'backdrop' | 'presence',
    WebGLUniformLocation | null
  >;
  let indexCount = 0;
  let ready = false;
  let software = false;

  let onScreen = false;
  let frame = 0;
  let last = 0;
  let time = START;

  function compile(context: WebGL2RenderingContext, type: number, source: string) {
    const shader = context.createShader(type)!;
    context.shaderSource(shader, source);
    context.compileShader(shader);
    return shader;
  }

  /** Program, capsule buffers and the fixed uniforms. Runs again after a lost context comes back. */
  function setup() {
    if (!gl) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[glass-helix]', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const { vertices, indices } = capsule();
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    indexCount = indices.length;

    uniforms = {
      model: gl.getUniformLocation(program, 'u_model'),
      projection: gl.getUniformLocation(program, 'u_projection'),
      spin: gl.getUniformLocation(program, 'u_spin'),
      backdrop: gl.getUniformLocation(program, 'u_backdrop'),
      presence: gl.getUniformLocation(program, 'u_presence'),
    };
    gl.uniformMatrix4fv(uniforms.model, false, modelMatrix());

    gl.uniform3fv(uniforms.backdrop, backdropColor(canvas));

    gl.enable(gl.DEPTH_TEST);
    // One surface per capsule, so a fading end shows the page through it, not its own far side.
    // Instances draw far end first, which keeps the fades blending over what lies behind them.
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    ready = true;
    resize();
  }

  function resize() {
    if (!gl || !ready) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const desktop = window.innerWidth >= 1024;
    gl.uniformMatrix4fv(
      uniforms.projection,
      false,
      projection(bounds, box.width, box.height, desktop ? DESKTOP_SCALE : 1),
    );
    gl.uniform1f(uniforms.presence, desktop ? DESKTOP_PRESENCE : 1);
    draw();
  }

  function draw() {
    if (!gl || !ready) return;
    gl.uniform1f(uniforms.spin, time * SPIN_SPEED);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElementsInstanced(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0, BARS);
  }

  function tick(now: number) {
    time += Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function update() {
    const still = reduceMotion.matches || software;
    const running = ready && onScreen && !still;
    if (running && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!running && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (still && time !== START) {
      time = START;
      draw();
    }
  }

  function start() {
    gl = canvas.getContext('webgl2', {
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!gl) return;
    software = softwareRendered(gl);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      ready = false;
      update();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      setup();
      update();
    });
    setup();
    new ResizeObserver(resize).observe(canvas);
  }

  // Set up shortly before the canvas scrolls in; draw only while it shows.
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !gl) start();
      update();
    },
    { rootMargin: '200px 0px' },
  ).observe(canvas);
  reduceMotion.addEventListener('change', update);
}

document.querySelectorAll<HTMLCanvasElement>('[data-glass-helix]').forEach(mount);

export {};
