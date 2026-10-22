import * as THREE from '../vendor/three.module.js';

/* 核废料多重屏障：相对比例的几何剖面，按需渲染，无外部资源。 */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  NEG.WasteBarrierScene = {
    create(canvas, options) {
      const opts = options || {};
      const noop = function () {};
      const fallback = { supported: false, setProgress: noop, setExploded: noop, resetView: noop, destroy: noop };
      if (!canvas || typeof canvas.getContext !== 'function' || !THREE.WebGLRenderer) return fallback;

      let renderer = null;
      let frame = null;
      let observer = null;
      let destroyed = false;
      let unavailable = false;
      let sizeDirty = true;
      let progress = 0;
      let exploded = 0;
      let pointer = null;
      let lastX = 0;
      let lastY = 0;
      const geometries = new Set();
      const materials = new Set();
      const listeners = [];
      const oldTouchAction = canvas.style.touchAction;
      const oldTabIndex = canvas.getAttribute('tabindex');
      const defaultRotation = { x: -0.06, y: -0.08 };
      let scene;
      let camera;
      let model;
      const layers = [];

      function geometry(value) { geometries.add(value); return value; }
      function material(value) { materials.add(value); return value; }

      function on(target, type, handler, config) {
        target.addEventListener(type, handler, config);
        listeners.push(() => target.removeEventListener(type, handler, config));
      }

      function cancelFrame() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      }

      function releasePointer() {
        const active = pointer;
        pointer = null;
        if (active !== null) {
          try { if (canvas.hasPointerCapture(active)) canvas.releasePointerCapture(active); } catch (e) { /* 已失去捕获 */ }
        }
      }

      function dispose() {
        if (destroyed) return;
        destroyed = true;
        cancelFrame();
        releasePointer();
        if (observer) observer.disconnect();
        observer = null;
        listeners.splice(0).forEach((remove) => remove());
        geometries.forEach((value) => value.dispose());
        materials.forEach((value) => value.dispose());
        geometries.clear();
        materials.clear();
        if (renderer) {
          try { renderer.dispose(); } catch (e) { /* 上下文已释放 */ }
          try { renderer.forceContextLoss(); } catch (e) { /* WebGL 不支持主动释放 */ }
          renderer = null;
        }
        canvas.style.touchAction = oldTouchAction;
        if (oldTabIndex === null) canvas.removeAttribute('tabindex');
        else canvas.setAttribute('tabindex', oldTabIndex);
        if (scene) scene.clear();
      }

      function fail() {
        if (destroyed || unavailable) return;
        unavailable = true;
        dispose();
        if (typeof opts.onUnavailable === 'function') {
          try { opts.onUnavailable(); } catch (e) { /* 保留外壳的备用交互 */ }
        }
      }

      function requestRender() {
        if (!destroyed && !unavailable && !document.hidden && frame === null) frame = requestAnimationFrame(render);
      }

      function render() {
        frame = null;
        if (destroyed || unavailable || document.hidden) return;
        try {
          if (sizeDirty) {
            const rect = canvas.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            if (!(width > 0 && height > 0)) return;
            sizeDirty = false;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(700000 / (width * height))));
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            // 窄屏主动后退，长条与展开层都保留在视野中。
            const distance = Math.max(9.8, 13.6 / Math.max(0.5, camera.aspect));
            camera.position.set(0.42, 0.35, 0.84).normalize().multiplyScalar(distance);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
          }
          renderer.render(scene, camera);
        } catch (e) { fail(); }
      }

      // 将截面沿长轴挤出；开口朝向默认视角，层层嵌套仍清晰可见。
      function extrude(shape, length) {
        const result = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 28, steps: 1 });
        result.translate(0, 0, -length / 2);
        result.rotateY(Math.PI / 2);
        return geometry(result);
      }

      function shell(inner, outer, length) {
        const shape = new THREE.Shape();
        const start = Math.PI;
        const end = Math.PI * 2.5;
        shape.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
        shape.absarc(0, 0, outer, start, end, false);
        shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
        shape.absarc(0, 0, inner, end, start, true);
        shape.closePath();
        return extrude(shape, length);
      }

      function rockSection(inner, outer, length) {
        const shape = new THREE.Shape();
        shape.moveTo(-outer, 0);
        shape.lineTo(-outer, -outer);
        shape.lineTo(outer, -outer);
        shape.lineTo(outer, outer);
        shape.lineTo(0, outer);
        shape.lineTo(0, inner);
        shape.absarc(0, 0, inner, Math.PI / 2, -Math.PI, true);
        shape.closePath();
        return extrude(shape, length);
      }

      function addLayer(meshGeometry, color, metalness, roughness) {
        const group = new THREE.Group();
        const surface = new THREE.Mesh(meshGeometry, material(new THREE.MeshStandardMaterial({
          color, metalness, roughness, side: THREE.DoubleSide
        })));
        const edgeMaterial = material(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.48 }));
        const edges = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(meshGeometry, 24)), edgeMaterial);
        group.add(surface, edges);
        model.add(group);
        layers.push({ group, surface, edgeMaterial });
        return group;
      }

      function setProgress(value) {
        if (destroyed) return;
        const number = Number(value);
        progress = Number.isFinite(number) ? clamp(Math.floor(number), 0, 4) : 0;
        layers.forEach((layer, index) => {
          layer.surface.visible = index < progress;
          layer.edgeMaterial.opacity = index < progress ? 0.7 : (index === progress ? 0.65 : 0.28);
        });
        requestRender();
      }

      function setExploded(value) {
        if (destroyed) return;
        const number = Number(value);
        exploded = Number.isFinite(number) ? clamp(number, 0, 1) : 0;
        layers.forEach((layer, index) => {
          const separation = 1.5 - index;
          layer.group.position.set(-separation * 0.2 * exploded, separation * 0.7 * exploded, separation * 1.35 * exploded);
        });
        requestRender();
      }

      function resetView() {
        if (destroyed) return;
        releasePointer();
        model.rotation.set(defaultRotation.x, defaultRotation.y, 0);
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        requestRender();
      }

      function resize() { sizeDirty = true; requestRender(); }

      function pointerDown(event) {
        if (pointer !== null || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
        pointer = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        try { canvas.setPointerCapture(pointer); } catch (e) { /* 浏览器可继续发送窗口事件 */ }
        try { canvas.focus({ preventScroll: true }); } catch (e) { canvas.focus(); }
        event.preventDefault();
      }

      function pointerMove(event) {
        if (event.pointerId !== pointer) return;
        model.rotation.y += (event.clientX - lastX) * 0.007;
        model.rotation.x = clamp(model.rotation.x + (event.clientY - lastY) * 0.006, -0.8, 0.65);
        lastX = event.clientX;
        lastY = event.clientY;
        requestRender();
      }

      function pointerEnd(event) {
        if (event.pointerId === pointer) releasePointer();
      }

      function zoomBy(factor) {
        camera.zoom = clamp(camera.zoom * factor, 0.55, 2.1);
        camera.updateProjectionMatrix();
        requestRender();
      }

      function wheel(event) {
        event.preventDefault();
        zoomBy(Math.exp(-clamp(event.deltaY, -160, 160) * 0.0018));
      }

      function keyDown(event) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const key = event.key;
        if (key === 'ArrowLeft') model.rotation.y -= 0.12;
        else if (key === 'ArrowRight') model.rotation.y += 0.12;
        else if (key === 'ArrowUp') model.rotation.x = clamp(model.rotation.x - 0.1, -0.8, 0.65);
        else if (key === 'ArrowDown') model.rotation.x = clamp(model.rotation.x + 0.1, -0.8, 0.65);
        else if (key === '+' || key === '=') zoomBy(1.12);
        else if (key === '-' || key === '_') zoomBy(1 / 1.12);
        else if (key === '0' || key === 'Home' || key.toLowerCase() === 'r') resetView();
        else return;
        event.preventDefault();
        event.stopPropagation();
        requestRender();
      }

      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setClearColor(0x000000, 0);
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
        model = new THREE.Group();
        scene.add(model);
        model.rotation.set(defaultRotation.x, defaultRotation.y, 0);

        scene.add(new THREE.HemisphereLight(0xe4f6ff, 0x263342, 0.7));
        const keyLight = new THREE.DirectionalLight(0xfff0d6, 1.1);
        keyLight.position.set(1, 5, 6);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x6bbde0, 0.45);
        rimLight.position.set(-6, 1, -3);
        scene.add(rimLight);

        const glass = geometry(new THREE.CylinderGeometry(0.43, 0.43, 5.7, 32));
        glass.rotateZ(-Math.PI / 2);
        addLayer(glass, 0xe3a347, 0.12, 0.31);
        addLayer(shell(0.48, 0.66, 6.0), 0x9bb9c7, 0.76, 0.26);
        addLayer(shell(0.71, 1.04, 6.4), 0xb89362, 0.03, 0.94);
        const rock = addLayer(rockSection(1.1, 1.49, 6.9), 0x728999, 0.04, 1);

        // 少量地层线帮助辨认围岩块体，保持几何体本身为视觉主体。
        const strata = [];
        for (let i = 0; i < 5; i++) {
          const y = -1.32 + i * 0.27;
          strata.push(-3.45, y, 1.495, 3.45, y + 0.07, 1.495);
        }
        const strataGeometry = geometry(new THREE.BufferGeometry());
        strataGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strata, 3));
        rock.add(new THREE.LineSegments(strataGeometry, material(new THREE.LineBasicMaterial({ color: 0x314e61, transparent: true, opacity: 0.6 }))));

        canvas.style.touchAction = 'none';
        if (canvas.tabIndex < 0) canvas.tabIndex = 0;
        on(canvas, 'pointerdown', pointerDown);
        on(window, 'pointermove', pointerMove);
        on(window, 'pointerup', pointerEnd);
        on(window, 'pointercancel', pointerEnd);
        on(canvas, 'lostpointercapture', pointerEnd);
        on(window, 'blur', releasePointer);
        on(canvas, 'wheel', wheel, { passive: false });
        on(canvas, 'keydown', keyDown);
        on(window, 'resize', resize);
        on(document, 'visibilitychange', () => {
          if (document.hidden) { releasePointer(); cancelFrame(); }
          else resize();
        });
        on(canvas, 'webglcontextlost', (event) => { event.preventDefault(); fail(); });
        if ('ResizeObserver' in window) {
          observer = new ResizeObserver(resize);
          observer.observe(canvas);
        }
        setProgress(opts.progress || 0);
        setExploded(opts.exploded || 0);
        requestRender();
      } catch (e) {
        dispose();
        return fallback;
      }

      return { supported: true, setProgress, setExploded, resetView, destroy: dispose };
    }
  };
})(window.NEG);
