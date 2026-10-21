/* A closed, abstract museum object. This scene contains no internal structure. */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 4; k++) result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
      }
    }
    return result;
  }

  function mesh() {
    const vertices = [];
    function vertex(position, normal, color) { vertices.push(...position, ...normal, ...color); }
    function spherePoint(latitude, longitude) {
      const normal = [Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude)];
      const marker = Math.abs(latitude - 1.05) < 0.16 && Math.abs(longitude - 1.18) < 0.17;
      const seam = Math.abs(latitude - Math.PI / 2) < 0.045;
      return {
        position: [normal[0] * 0.91, normal[1] * 0.91 + 0.19, normal[2] * 0.91], normal,
        color: marker ? [0.24, 0.83, 0.88] : seam ? [0.35, 0.48, 0.54] : [0.61, 0.72, 0.78]
      };
    }
    function emit(point) { vertex(point.position, point.normal, point.color); }
    const latitudeSteps = 40, longitudeSteps = 64;
    for (let lat = 0; lat < latitudeSteps; lat++) {
      for (let lon = 0; lon < longitudeSteps; lon++) {
        const a = spherePoint(lat / latitudeSteps * Math.PI, lon / longitudeSteps * Math.PI * 2);
        const b = spherePoint((lat + 1) / latitudeSteps * Math.PI, lon / longitudeSteps * Math.PI * 2);
        const c = spherePoint((lat + 1) / latitudeSteps * Math.PI, (lon + 1) / longitudeSteps * Math.PI * 2);
        const d = spherePoint(lat / latitudeSteps * Math.PI, (lon + 1) / longitudeSteps * Math.PI * 2);
        [a, b, c, a, c, d].forEach(emit);
      }
    }
    function cylinder(radius, bottom, top, color) {
      for (let index = 0; index < 64; index++) {
        const a = index / 64 * Math.PI * 2, b = (index + 1) / 64 * Math.PI * 2;
        const na = [Math.cos(a), 0, Math.sin(a)], nb = [Math.cos(b), 0, Math.sin(b)];
        const pa = [radius * na[0], bottom, radius * na[2]], pb = [radius * nb[0], bottom, radius * nb[2]];
        const qa = [pa[0], top, pa[2]], qb = [pb[0], top, pb[2]];
        [[pa, na], [qa, na], [qb, nb], [pa, na], [qb, nb], [pb, nb]].forEach(([p, n]) => vertex(p, n, color));
        [[0, top, 0], qa, qb].forEach(p => vertex(p, [0, 1, 0], color));
        [[0, bottom, 0], pb, pa].forEach(p => vertex(p, [0, -1, 0], color));
      }
    }
    cylinder(0.15, -0.90, -0.71, [0.29, 0.43, 0.49]);
    cylinder(0.72, -1.10, -0.90, [0.13, 0.25, 0.31]);
    cylinder(0.74, -1.10, -1.055, [0.16, 0.55, 0.59]);
    return new Float32Array(vertices);
  }

  function create(canvas, options) {
    const opts = options || {};
    const unavailable = { supported: false, rotate() {}, zoom() {}, resetView() {}, destroy() {} };
    if (!canvas || typeof canvas.getContext !== 'function') return unavailable;
    let gl;
    try { gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (error) { return unavailable; }
    if (!gl) return unavailable;

    let disposed = false, failed = false, frame = null, observer = null;
    let program = null, buffer = null;
    const shaders = [], removers = [];
    let yaw = 0.4, pitch = 0.12, distance = 4.25;
    let pointer = null, pointerX = 0, pointerY = 0;

    function on(target, type, handler, eventOptions) {
      target.addEventListener(type, handler, eventOptions);
      removers.push(() => target.removeEventListener(type, handler, eventOptions));
    }
    function stopFrame() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    }
    function endPointer(event) {
      if (pointer === null || (event && event.pointerId !== undefined && event.pointerId !== pointer)) return;
      const old = pointer;
      pointer = null;
      canvas.classList.remove('is-dragging');
      try { if (canvas.hasPointerCapture(old)) canvas.releasePointerCapture(old); } catch (error) { /* capture may already be released */ }
    }
    function destroy() {
      if (disposed) return;
      disposed = true;
      stopFrame();
      endPointer();
      removers.splice(0).forEach(remove => remove());
      if (observer) observer.disconnect();
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    function fail() {
      if (disposed || failed) return;
      failed = true;
      stopFrame();
      if (typeof opts.onUnavailable === 'function') opts.onUnavailable();
    }
    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    }

    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER,
        'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;void main(){vNormal=mat3(uModel)*aNormal;vColor=aColor;vPosition=(uModel*vec4(aPosition,1.0)).xyz;gl_Position=uMvp*vec4(aPosition,1.0);}'));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER,
        'precision mediump float;varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-2.5,3.5,4.0));float diffuse=max(dot(n,light),0.0);vec3 view=normalize(vec3(0.0,0.0,4.0)-vPosition);float specular=pow(max(dot(n,normalize(light+view)),0.0),40.0);float rim=pow(1.0-max(dot(n,view),0.0),3.0);vec3 color=vColor*(0.24+0.74*diffuse)+vec3(0.72,0.86,0.90)*specular*0.7+vec3(0.03,0.18,0.20)*rim;gl_FragColor=vec4(color,1.0);}'));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program link failed');
      const data = mesh();
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.useProgram(program);
      ['aPosition', 'aNormal', 'aColor'].forEach((name, index) => {
        const attribute = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 36, index * 12);
      });
      const mvpUniform = gl.getUniformLocation(program, 'uMvp');
      const modelUniform = gl.getUniformLocation(program, 'uModel');
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);

      function render() {
        frame = null;
        if (disposed || failed || document.hidden) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(700000 / (rect.width * rect.height)));
        const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
        const yRotation = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
        const xRotation = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]);
        const model = multiply(xRotation, yRotation);
        const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.02, -distance, 1]);
        const focal = 1 / Math.tan(42 / 180 * Math.PI / 2), near = 0.1, far = 40;
        const projection = new Float32Array([focal / (width / height), 0, 0, 0, 0, focal, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
        gl.uniformMatrix4fv(modelUniform, false, model);
        gl.uniformMatrix4fv(mvpUniform, false, multiply(projection, multiply(view, model)));
        gl.drawArrays(gl.TRIANGLES, 0, data.length / 9);
      }
      function requestRender() {
        if (!disposed && !failed && frame === null && !document.hidden) frame = requestAnimationFrame(render);
      }
      function rotate(horizontal, vertical) {
        if (disposed || failed) return;
        yaw += Number.isFinite(horizontal) ? horizontal : 0;
        pitch = clamp(pitch + (Number.isFinite(vertical) ? vertical : 0), -0.85, 0.85);
        requestRender();
      }
      function zoom(change) {
        if (disposed || failed || !Number.isFinite(change)) return;
        distance = clamp(distance + change, 3.2, 6.2);
        requestRender();
      }
      function resetView() {
        if (disposed || failed) return;
        yaw = 0.4; pitch = 0.12; distance = 4.25;
        requestRender();
      }
      on(canvas, 'pointerdown', event => {
        if (pointer !== null || event.button !== 0 || disposed || failed) return;
        pointer = event.pointerId; pointerX = event.clientX; pointerY = event.clientY;
        canvas.classList.add('is-dragging');
        try { canvas.setPointerCapture(pointer); } catch (error) { /* buttons remain available */ }
      });
      on(canvas, 'pointermove', event => {
        if (event.pointerId !== pointer) return;
        rotate((event.clientX - pointerX) * 0.01, (event.clientY - pointerY) * 0.008);
        pointerX = event.clientX; pointerY = event.clientY;
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => on(canvas, type, endPointer));
      on(window, 'blur', () => endPointer());
      on(canvas, 'wheel', event => { event.preventDefault(); zoom(clamp(event.deltaY, -120, 120) * 0.004); }, { passive: false });
      on(canvas, 'keydown', event => {
        const actions = { ArrowLeft: () => rotate(-0.18, 0), ArrowRight: () => rotate(0.18, 0), ArrowUp: () => rotate(0, -0.14), ArrowDown: () => rotate(0, 0.14), '+': () => zoom(-0.2), '=': () => zoom(-0.2), '-': () => zoom(0.2), Home: resetView };
        if (Object.prototype.hasOwnProperty.call(actions, event.key)) { event.preventDefault(); actions[event.key](); }
      });
      on(canvas, 'webglcontextlost', event => { event.preventDefault(); fail(); });
      on(document, 'visibilitychange', () => { if (document.hidden) { stopFrame(); endPointer(); } else requestRender(); });
      if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(requestRender); observer.observe(canvas); }
      else on(window, 'resize', requestRender);
      requestRender();
      return { supported: true, rotate, zoom, resetView, destroy };
    } catch (error) {
      // Initializing a canvas must never prevent the reading lesson from working.
      destroy();
      return unavailable;
    }
  }

  NEG.HistoryExhibitScene = { create };
})(window.NEG);
