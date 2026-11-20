/* KD Daramola Portfolio — glossy 3D gradient ring (hero)
   Classic script + dynamic import, so it also works when index.html is opened straight from disk.
   If WebGL or the CDN is unavailable, the CSS fallback ring in .ring-fallback stays visible. */
(function () {
  const canvas = document.getElementById('ring');
  if (!canvas) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
    .then(start)
    .catch(() => { /* keep CSS fallback */ });

  function start(THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const vert = /* glsl */`
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`;

    const frag = /* glsl */`
      uniform float uTime;
      uniform float uAlpha;
      uniform float uShift;
      uniform float uGlass;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vLocal;

      vec3 palette(float t) {
        vec3 black  = vec3(0.035, 0.045, 0.05);
        vec3 ice    = vec3(0.86, 0.95, 0.98);
        vec3 aurora = vec3(0.30, 0.92, 0.66);
        vec3 teal   = vec3(0.10, 0.36, 0.38);
        t = fract(t);
        if (t < 0.30) return mix(black, ice, smoothstep(0.0, 1.0, t / 0.30));
        if (t < 0.50) return mix(ice, aurora, (t - 0.30) / 0.20);
        if (t < 0.70) return mix(aurora, teal, (t - 0.50) / 0.20);
        return mix(teal, black, (t - 0.70) / 0.30);
      }

      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vView);
        float ang = atan(vLocal.y, vLocal.x) / 6.2831853 + 0.5;

        vec3 base = palette(ang * 1.0 + uShift + uTime * 0.04 + n.y * 0.18);

        vec3 L1 = normalize(vec3(-0.5, 0.9, 0.7));
        vec3 L2 = normalize(vec3(0.8, -0.3, 0.5));
        float diff = max(dot(n, L1), 0.0) * 0.65 + max(dot(n, L2), 0.0) * 0.25 + 0.35;
        float spec = pow(max(dot(n, normalize(L1 + v)), 0.0), 70.0) * 1.1
                   + pow(max(dot(n, normalize(L2 + v)), 0.0), 40.0) * 0.35;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);

        vec3 col = base * diff;
        col += fres * vec3(0.70, 0.90, 0.95) * 0.9;  // icy rim
        col += spec * vec3(0.95, 1.0, 1.0);
        col = mix(col, col * vec3(0.25, 0.32, 0.33), smoothstep(0.1, -0.9, n.y) * 0.6); // sink underside into black

        float a = uAlpha;
        if (uGlass > 0.5) a *= 0.15 + fres * 0.85;
        gl_FragColor = vec4(col, a);
      }`;

    function makeMat(opts) {
      return new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: !opts.glass,
        side: opts.glass ? THREE.DoubleSide : THREE.FrontSide,
        blending: opts.glass ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uAlpha: { value: opts.alpha ?? 1 },
          uShift: { value: opts.shift ?? 0 },
          uGlass: { value: opts.glass ? 1 : 0 },
        },
      });
    }

    const group = new THREE.Group();
    scene.add(group);

    // Main thick ribbon ring
    const main = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.42, 96, 256), makeMat({}));
    main.scale.set(1, 1, 0.62);
    group.add(main);

    // Inner thinner ring, offset
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.16, 64, 256), makeMat({ shift: 0.35 }));
    inner.rotation.set(0.35, -0.25, 0);
    group.add(inner);

    // Outer glass band
    const glass = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.22, 64, 256), makeMat({ glass: true, alpha: 0.9, shift: 0.6 }));
    glass.scale.set(1, 1, 0.5);
    glass.rotation.set(-0.2, 0.3, 0);
    group.add(glass);

    // Thin orbit line
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.006, 8, 300), new THREE.MeshBasicMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.28 }));
    orbit.rotation.set(1.2, 0.2, 0);
    group.add(orbit);

    const mats = [main.material, inner.material, glass.material];

    group.rotation.set(0.95, -0.35, 0.15);

    // Sizing
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    // Pointer parallax
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // Scroll progress through hero
    const hero = document.querySelector('.hero');
    let scrollP = 0;
    const onScroll = () => {
      const h = hero.offsetHeight || 1;
      scrollP = Math.min(1, Math.max(0, window.scrollY / h));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Only render when hero is visible
    let visible = true;
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) loop(); }).observe(hero);

    const clock = new THREE.Clock();
    let running = false;
    // Intro: ring scales in after the loader curtain
    let introT = reduce ? 1 : 0;

    function frame() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (introT < 1 && document.documentElement.classList.contains('loaded')) introT = Math.min(1, introT + dt * 0.7);
      const ease = 1 - Math.pow(1 - introT, 3);

      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;

      const spin = reduce ? 0 : t;
      group.rotation.x = 0.95 + cur.y * 0.18 + Math.sin(spin * 0.4) * 0.08 + scrollP * 0.6;
      group.rotation.y = -0.35 + cur.x * 0.25 + Math.sin(spin * 0.3) * 0.12;
      group.rotation.z = 0.15 + spin * 0.06 + scrollP * 0.8;
      main.rotation.z = spin * 0.12;
      inner.rotation.z = -spin * 0.25;
      glass.rotation.z = spin * 0.08;
      orbit.rotation.z = -spin * 0.05;

      const s = (0.7 + 0.3 * ease) * (1 - scrollP * 0.25);
      group.scale.setScalar(s);
      group.position.y = scrollP * 1.2 + (1 - ease) * -0.6;
      mats.forEach((m) => { m.uniforms.uTime.value = spin; });
      canvas.style.opacity = '';
      renderer.domElement.style.filter = scrollP > 0 ? `blur(${scrollP * 6}px)` : '';

      renderer.render(scene, camera);
    }

    function loop() {
      if (running) return;
      running = true;
      const tick = () => {
        if (!visible) { running = false; return; }
        frame();
        if (reduce) { running = false; return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    frame();
    document.documentElement.classList.add('webgl-ready');
    loop();
  }
})();
