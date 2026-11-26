"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CheckCircle2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface Course3DNode {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  maxSeats: number;
  activeSeats: number;
  prerequisiteCode: string | null;
}

function createLabelTexture(code: string, isSelected: boolean, hasPrereq: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pill background
  const bgColor = isSelected
    ? "rgba(0, 85, 204, 0.96)"
    : hasPrereq
      ? "rgba(24, 34, 62, 0.92)"
      : "rgba(0, 35, 75, 0.9)";
  const borderColor = isSelected
    ? "#93C5FD"
    : hasPrereq
      ? "#FFB800"
      : "rgba(147, 197, 253, 0.55)";

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(14, 14, 228, 68, 22);
  ctx.fill();
  ctx.stroke();

  // Label text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 34px Inter, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, 128, 49);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function UniTrack3DCanvas({
  courses,
  selectedCode,
  onSelectCourse,
}: {
  courses: Course3DNode[];
  selectedCode: string | null;
  onSelectCourse: (code: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedCodeRef = useRef<string | null>(selectedCode);
  const onSelectRef = useRef(onSelectCourse);
  const autoRotateRef = useRef(true);
  const resetViewRef = useRef<(() => void) | null>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    onSelectRef.current = onSelectCourse;
  }, [onSelectCourse]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      autoRotateRef.current = false;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      const rafId = requestAnimationFrame(() => setWebglUnsupported(true));
      return () => cancelAnimationFrame(rafId);
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 460;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 8.8);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xdbeafe, 1.0);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5, 7, 6);
    const rimLight = new THREE.PointLight(0x38bdf8, 2.5, 22);
    rimLight.position.set(-4, -2, 4);
    const accentLight = new THREE.PointLight(0xffb800, 1.3, 18);
    accentLight.position.set(3.5, 2.5, -2);
    scene.add(ambient, keyLight, rimLight, accentLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Central 24-Credit CBCS Core
    const coreGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0055cc,
      emissive: 0x002b6b,
      emissiveIntensity: 0.7,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    const wireGeo = new THREE.IcosahedronGeometry(1.16, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    rootGroup.add(wireMesh);

    // Dual Orbit Rings (CBCS 24-Credit Cap Visual)
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.024, 16, 100),
      new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.55,
      })
    );
    ring1.rotation.x = Math.PI * 0.42;
    ring1.rotation.y = 0.25;
    rootGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.018, 16, 100),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.32,
      })
    );
    ring2.rotation.x = -Math.PI * 0.34;
    ring2.rotation.z = 0.45;
    rootGroup.add(ring2);

    // Ambient Academic Particles
    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 3.8 + ((i * 37) % 40) * 0.12;
      const theta = i * 2.39996;
      const phi = ((i * 19) % 100) * 0.0314;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = (Math.cos(phi) - 0.1) * 3.6;
      particlePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0xbfdbfe,
      size: 0.055,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    // Course Constellation Nodes
    const displayCourses = courses.slice(0, 6);
    const nodePositions = new Map<string, THREE.Vector3>();
    const nodeEntries: Array<{
      code: string;
      group: THREE.Group;
      mesh: THREE.Mesh;
      halo: THREE.Mesh;
      hitMesh: THREE.Mesh;
      sprite: THREE.Sprite;
      basePos: THREE.Vector3;
      phase: number;
      hasPrereq: boolean;
      isFull: boolean;
    }> = [];

    const hitTargets: THREE.Mesh[] = [];
    const disposableTextures: THREE.Texture[] = [];

    displayCourses.forEach((course, idx) => {
      const angle = (idx / Math.max(1, displayCourses.length)) * Math.PI * 2 - Math.PI / 3;
      const radius = idx % 2 === 0 ? 2.85 : 3.25;
      const yOffset = Math.sin(idx * 1.45) * 1.05;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius * 0.85
      );
      nodePositions.set(course.code, pos);

      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(pos);

      const isFull = course.activeSeats >= course.maxSeats;
      const hasPrereq = Boolean(course.prerequisiteCode);
      const nodeColor = isFull
        ? 0xef4444
        : hasPrereq
          ? 0xffb800
          : 0x38bdf8;

      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.36, 1),
        new THREE.MeshStandardMaterial({
          color: nodeColor,
          emissive: nodeColor,
          emissiveIntensity: 0.45,
          roughness: 0.22,
          metalness: 0.35,
        })
      );
      nodeGroup.add(mesh);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.025, 12, 48),
        new THREE.MeshBasicMaterial({
          color: hasPrereq ? 0xffb800 : 0x93c5fd,
          transparent: true,
          opacity: 0.75,
        })
      );
      halo.rotation.x = Math.PI / 2.4;
      nodeGroup.add(halo);

      // Generous invisible raycast sphere for smooth mouse/touch picking
      const hitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.72, 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.userData = { code: course.code };
      nodeGroup.add(hitMesh);
      hitTargets.push(hitMesh);

      // Floating code badge sprite
      const texture = createLabelTexture(
        course.code,
        course.code === selectedCodeRef.current,
        hasPrereq
      );
      if (texture) disposableTextures.push(texture);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture ?? undefined,
          transparent: true,
          depthTest: false,
        })
      );
      sprite.position.set(0, 0.72, 0);
      sprite.scale.set(1.42, 0.54, 1);
      nodeGroup.add(sprite);

      // Connection spoke to CBCS core
      const spokeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        pos.clone(),
      ]);
      const spokeLine = new THREE.Line(
        spokeGeo,
        new THREE.LineBasicMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0.25,
        })
      );
      rootGroup.add(spokeLine);

      rootGroup.add(nodeGroup);
      nodeEntries.push({
        code: course.code,
        group: nodeGroup,
        mesh,
        halo,
        hitMesh,
        sprite,
        basePos: pos.clone(),
        phase: idx * 1.1,
        hasPrereq,
        isFull,
      });
    });

    // Prerequisite Dependency Beams (e.g., BCA-101 -> BCA-201)
    const prereqPulses: Array<{
      curve: THREE.QuadraticBezierCurve3;
      bead: THREE.Mesh;
      offset: number;
    }> = [];

    displayCourses.forEach((course, idx) => {
      if (!course.prerequisiteCode) return;
      const fromPos = nodePositions.get(course.prerequisiteCode);
      const toPos = nodePositions.get(course.code);
      if (!fromPos || !toPos) return;

      const mid = fromPos.clone().add(toPos).multiplyScalar(0.5);
      mid.y += 0.95;
      const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.032, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0xffb800,
        transparent: true,
        opacity: 0.85,
      });
      rootGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      rootGroup.add(bead);
      prereqPulses.push({ curve, bead, offset: idx * 0.3 });
    });

    // Interactive Pointer Drag + Raycaster Hover/Click
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let isDragging = false;
    let dragDistance = 0;
    let lastX = 0;
    let lastY = 0;
    let rotVelX = 0;
    let rotVelY = 0;
    let targetRotX = 0.12;
    let targetRotY = -0.3;

    resetViewRef.current = () => {
      targetRotX = 0.12;
      targetRotY = -0.3;
      rotVelX = 0;
      rotVelY = 0;
    };

    function updatePointerNdc(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickCourseCode(e: PointerEvent): string | null {
      updatePointerNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.code as string) ?? null;
      }
      return null;
    }

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        dragDistance += Math.abs(dx) + Math.abs(dy);
        targetRotY += dx * 0.008;
        targetRotX = Math.max(-0.85, Math.min(0.85, targetRotX + dy * 0.006));
        rotVelY = dx * 0.0012;
        rotVelX = dy * 0.0008;
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }

      const code = pickCourseCode(e);
      setHoveredCode(code);
      renderer.domElement.style.cursor = code ? "pointer" : "grab";
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && dragDistance < 8) {
        const code = pickCourseCode(e);
        if (code) {
          onSelectRef.current(code);
        }
      }
      isDragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already released
      }
    };

    const domEl = renderer.domElement;
    domEl.style.cursor = "grab";
    domEl.style.touchAction = "pan-y";
    domEl.addEventListener("pointerdown", onPointerDown);
    domEl.addEventListener("pointermove", onPointerMove);
    domEl.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(280, entry.contentRect.width);
      const h = Math.max(320, entry.contentRect.height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId = 0;
    let lastRenderedSelected: string | null = selectedCodeRef.current;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        if (autoRotateRef.current) {
          targetRotY += 0.0028;
        }
        targetRotY += rotVelY;
        targetRotX = Math.max(-0.85, Math.min(0.85, targetRotX + rotVelX));
        rotVelX *= 0.92;
        rotVelY *= 0.92;
      }

      rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08;
      rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08;

      coreMesh.rotation.y = elapsed * 0.35;
      coreMesh.rotation.x = elapsed * 0.18;
      wireMesh.rotation.y = -elapsed * 0.2;
      ring1.rotation.z = elapsed * 0.22;
      ring2.rotation.z = -elapsed * 0.16;
      particles.rotation.y = elapsed * 0.04;

      const activeSelected = selectedCodeRef.current;
      const selectionChanged = activeSelected !== lastRenderedSelected;
      if (selectionChanged) {
        lastRenderedSelected = activeSelected;
      }

      for (const entry of nodeEntries) {
        const isSel = entry.code === activeSelected;
        const bob = Math.sin(elapsed * 1.4 + entry.phase) * 0.09;
        entry.group.position.y = entry.basePos.y + bob;
        entry.mesh.rotation.y = elapsed * 0.7 + entry.phase;
        entry.halo.rotation.z = elapsed * 0.9;

        const targetScale = isSel ? 1.32 : 1.0;
        entry.mesh.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.12
        );
        entry.halo.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.12
        );

        if (selectionChanged) {
          const nextTex = createLabelTexture(
            entry.code,
            isSel,
            entry.hasPrereq
          );
          if (nextTex) {
            disposableTextures.push(nextTex);
            const mat = entry.sprite.material as THREE.SpriteMaterial;
            mat.map?.dispose();
            mat.map = nextTex;
            mat.needsUpdate = true;
          }
        }
      }

      for (const pulse of prereqPulses) {
        const t = (elapsed * 0.35 + pulse.offset) % 1;
        pulse.curve.getPointAt(t, pulse.bead.position);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      domEl.removeEventListener("pointermove", onPointerMove);
      domEl.removeEventListener("pointerup", onPointerUp);
      for (const t of disposableTextures) t.dispose();
      renderer.dispose();
    };
  }, [courses]);

  const activeNode =
    courses.find((c) => c.code === (hoveredCode ?? selectedCode)) ?? courses[0];

  if (webglUnsupported) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/10 p-6 text-center text-white backdrop-blur-md">
        <Sparkles className="h-8 w-8 text-[#FFB800]" />
        <p className="mt-3 text-base font-bold">
          UniTrack Interactive Course Graph
        </p>
        <p className="mt-1 max-w-sm text-xs text-blue-100">
          Select any BCA course below to inspect credits, seats, and
          prerequisites.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {courses.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelectCourse(c.code)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                selectedCode === c.code
                  ? "bg-[#0055CC] text-white"
                  : "bg-white/15 text-blue-100"
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[430px] w-full flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 shadow-2xl backdrop-blur-sm sm:h-[490px]">
      {/* Top Floating HUD */}
      <div className="pointer-events-none relative z-10 flex items-center justify-between px-4 pt-3.5 text-[11px] text-blue-100">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#001F44]/75 px-3 py-1 font-medium backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-[#FFB800]" />
          Drag to orbit 3D graph • Click any node
        </span>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            aria-label={autoRotate ? "Pause 3D rotation" : "Play 3D rotation"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#001F44]/80 text-white transition-colors hover:bg-[#0055CC]"
          >
            {autoRotate ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => resetViewRef.current?.()}
            aria-label="Reset 3D camera angle"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#001F44]/80 text-white transition-colors hover:bg-[#0055CC]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive WebGL Mount */}
      <div
        ref={mountRef}
        aria-label="Interactive 3D CBCS prerequisite constellation"
        className="absolute inset-0 h-full w-full"
      />

      {/* Bottom Accessible Node Selector + Inspector Overlay */}
      <div className="pointer-events-none relative z-10 space-y-2.5 p-3.5 sm:p-4">
        {activeNode && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#001A38]/85 px-4 py-2.5 text-white backdrop-blur-md">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-[#60A5FA]">{activeNode.code}</span>
                <span className="truncate">{activeNode.title}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-blue-100/90">
                <span>{activeNode.credits} Credits</span>
                <span>•</span>
                <span>Sem {activeNode.semester}</span>
                <span>•</span>
                <span>
                  {activeNode.activeSeats}/{activeNode.maxSeats} Seats
                </span>
              </div>
            </div>

            {activeNode.prerequisiteCode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB800]/20 px-2.5 py-1 text-[11px] font-semibold text-[#FFD452]">
                <Lock className="h-3 w-3" />
                Requires {activeNode.prerequisiteCode}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#22AA22]/25 px-2.5 py-1 text-[11px] font-semibold text-[#86EFAC]">
                <CheckCircle2 className="h-3 w-3" />
                Direct Entry
              </span>
            )}
          </div>
        )}

        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          {courses.map((course) => {
            const isSel = activeNode?.code === course.code;
            return (
              <button
                key={course.code}
                type="button"
                onClick={() => onSelectCourse(course.code)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isSel
                    ? "bg-[#0055CC] text-white ring-1 ring-blue-300"
                    : "bg-[#001A38]/75 text-blue-100 hover:bg-[#0055CC]/60"
                }`}
              >
                {course.code}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
