'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import ForceGraph3D from 'r3f-forcegraph';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GraphMethods, LinkObject, NodeObject } from 'r3f-forcegraph';

interface GraphNode {
  id: string;
  type: 'character' | 'world' | 'foreshadowing';
  label: string;
  color: string;
  val: number;
  data: unknown;
}

interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
  label?: string;
  id?: string;
  curvature?: number;
  curveRotation?: number;
}

interface Graph3DClientProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (node: GraphNode) => void;
  onBackgroundClick?: () => void;
  selectedNodeId?: string | null;
  autoRotate?: boolean;
}

type NodeWithTexture = GraphNode & { labelTexture: THREE.Texture };
type FocusableNode = { x?: number; y?: number; z?: number };
type StyledLink = GraphLink & { id: string; curvature: number; curveRotation: number };

type RefNode = NodeObject<{ id: string }>;
type RefLink = LinkObject<{ id: string }, StyledLink>;

function getId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return '';
}

function hashStringToUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 生成节点标签纹理
function generateLabelTexture(text: string, borderColor: string = '#ffffff'): THREE.Texture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D context');
  }

  // 设置画布大小
  canvas.width = 512;
  canvas.height = 128;

  // 设置字体和样式
  context.font = '600 48px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const rawText = String(text ?? '').trim();
  const displayText = rawText.length > 18 ? `${rawText.slice(0, 18)}…` : rawText || '未命名';

  // 背景标签（更接近 Obsidian 的风格）
  const paddingX = 28;
  const textWidth = context.measureText(displayText).width;
  const boxWidth = Math.min(canvas.width - paddingX * 2, Math.max(180, textWidth + paddingX * 2));
  const boxHeight = 80;
  const x = (canvas.width - boxWidth) / 2;
  const y = (canvas.height - boxHeight) / 2;
  const radius = 16;

  context.save();
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + boxWidth, y, x + boxWidth, y + boxHeight, radius);
  context.arcTo(x + boxWidth, y + boxHeight, x, y + boxHeight, radius);
  context.arcTo(x, y + boxHeight, x, y, radius);
  context.arcTo(x, y, x + boxWidth, y, radius);
  context.closePath();

  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 18;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 8;
  context.fillStyle = 'rgba(11, 14, 26, 0.78)';
  context.fill();

  context.shadowColor = 'transparent';
  context.lineWidth = 4;
  context.strokeStyle = borderColor;
  context.stroke();
  context.restore();

  // 绘制文本
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.65)';
  context.shadowBlur = 6;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2;
  context.fillStyle = '#f8fafc';
  context.fillText(displayText, canvas.width / 2, canvas.height / 2 + 2);
  context.restore();

  // 创建纹理
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

function GraphScene({
  nodes,
  links,
  onNodeClick,
  selectedNodeId,
  autoRotate,
}: Graph3DClientProps) {
  const fgRef = useRef<GraphMethods<RefNode, RefLink> | undefined>(undefined);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [hoverLinkId, setHoverLinkId] = useState<string | null>(null);

  const activeNodeId = hoverNodeId || selectedNodeId || null;

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  // Force graph layout tick
  useFrame(() => {
    fgRef.current?.tickFrame?.();
  });

  // 为每个节点生成标签纹理（使用 useMemo 避免重复生成）
  const nodesWithTextures = useMemo<NodeWithTexture[]>(() => {
    return nodes.map(node => ({
      ...node,
      labelTexture: generateLabelTexture(node.label, node.color)
    }));
  }, [nodes]);

  const linksWithStyle = useMemo<StyledLink[]>(() => {
    return links.map((link, index) => {
      const sourceId = getId(link.source);
      const targetId = getId(link.target);
      const key = link.id || `${sourceId}→${targetId}:${link.label || ''}:${index}`;
      const rotation = (hashStringToUnit(key) - 0.5) * Math.PI;

      return {
        ...link,
        id: key,
        curvature: link.curvature ?? 0.22,
        curveRotation: link.curveRotation ?? rotation,
      };
    });
  }, [links]);

  const focusRef = useRef<{
    startCam: THREE.Vector3;
    startTarget: THREE.Vector3;
    endCam: THREE.Vector3;
    endTarget: THREE.Vector3;
    startMs: number;
    durationMs: number;
  } | null>(null);

  useFrame(() => {
    const focus = focusRef.current;
    if (!focus) return;

    const now = performance.now();
    const t = Math.min(1, (now - focus.startMs) / focus.durationMs);
    const eased = easeInOutCubic(t);

    camera.position.lerpVectors(focus.startCam, focus.endCam, eased);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(focus.startTarget, focus.endTarget, eased);
      controlsRef.current.update();
    } else {
      camera.lookAt(focus.endTarget);
    }

    if (t >= 1) {
      focusRef.current = null;
    }
  });

  const focusOnNode = (node: FocusableNode) => {
    const nodePos = new THREE.Vector3(node.x || 0, node.y || 0, node.z || 0);
    const controls = controlsRef.current;
    const currentTarget = controls?.target?.clone() || new THREE.Vector3(0, 0, 0);

    const startCam = camera.position.clone();
    const startTarget = currentTarget.clone();

    const dir = startCam.clone().sub(startTarget).normalize();
    const currentDistance = startCam.distanceTo(startTarget);
    const targetDistance = Math.max(220, Math.min(520, currentDistance));

    const endTarget = nodePos;
    const endCam = nodePos.clone().add(dir.multiplyScalar(targetDistance));

    focusRef.current = {
      startCam,
      startTarget,
      endCam,
      endTarget,
      startMs: performance.now(),
      durationMs: 900,
    };
  };

  const highlightNodeIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
      const set = map.get(a) || new Set<string>();
      set.add(b);
      map.set(a, set);
    };

    linksWithStyle.forEach((l) => {
      const a = getId(l.source);
      const b = getId(l.target);
      if (!a || !b) return;
      add(a, b);
      add(b, a);
    });

    if (!activeNodeId) return new Set<string>();

    const result = new Set<string>();
    result.add(activeNodeId);
    map.get(activeNodeId)?.forEach((id) => result.add(id));
    return result;
  }, [activeNodeId, linksWithStyle]);

  const isLinkActive = (link: { id?: unknown; source?: unknown; target?: unknown }) => {
    if (hoverLinkId && String(link.id || '') === hoverLinkId) return true;
    if (!activeNodeId) return false;
    const a = getId(link.source);
    const b = getId(link.target);
    return a === activeNodeId || b === activeNodeId;
  };

  return (
    <>
      {/* 背景：深色 + 星点，更接近 Obsidian Graph View 的“宇宙感” */}
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#05060a', 450, 1200]} />
      <Stars radius={800} depth={90} count={1400} factor={7} saturation={0} fade speed={1} />

      {/* 环境光 */}
      <ambientLight intensity={0.6} />
      {/* 定向光 */}
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      {/* 轨道控制器 - 支持旋转、缩放、平移 */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        autoRotate={Boolean(autoRotate)}
        autoRotateSpeed={0.35}
      />

      {/* 力导向图 */}
      <ForceGraph3D
        ref={fgRef}
        graphData={{ nodes: nodesWithTextures, links: linksWithStyle }}
        nodeColor={(node) => {
          const base = String((node as { color?: unknown }).color || '#94a3b8');
          if (!activeNodeId) return base;
          const id = String((node as { id?: unknown }).id || '');
          if (id === activeNodeId) return '#f8fafc';
          if (highlightNodeIds.has(id)) return base;
          return '#334155';
        }}
        nodeVal={(node) => {
          const base = Number((node as { val?: unknown }).val || 10);
          const id = String((node as { id?: unknown }).id || '');

          if (!activeNodeId) return base;
          if (id === activeNodeId) return base * 1.8;
          if (highlightNodeIds.has(id)) return base * 1.2;
          return base * 0.6;
        }}
        linkCurvature="curvature"
        linkCurveRotation="curveRotation"
        linkColor={(link) => (isLinkActive(link as { id?: unknown; source?: unknown; target?: unknown }) ? '#f59e0b' : '#64748b')}
        linkOpacity={0.55}
        linkWidth={(link) => (isLinkActive(link as { id?: unknown; source?: unknown; target?: unknown }) ? 2.5 : 1)}
        linkDirectionalParticles={(link) => (isLinkActive(link as { id?: unknown; source?: unknown; target?: unknown }) ? 2 : 0)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.007}
        onNodeClick={(node) => {
          onNodeClick(node as unknown as GraphNode);
          focusOnNode(node as FocusableNode);
        }}
        onNodeHover={(node) => {
          setHoverLinkId(null);
          setHoverNodeId(node ? String((node as { id?: unknown }).id || '') : null);
          document.body.style.cursor = node ? 'pointer' : 'auto';
        }}
        onLinkHover={(link) => {
          setHoverNodeId(null);
          setHoverLinkId(link ? String((link as { id?: unknown }).id || '') : null);
          document.body.style.cursor = 'auto';
        }}
        nodeThreeObject={(node) => {
          const labelTexture = (node as { labelTexture?: THREE.Texture }).labelTexture;
          // 使用 Sprite 显示节点标签
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: labelTexture || null,
              transparent: true,
              depthWrite: false
            })
          );
          sprite.position.set(0, 12, 0);
          sprite.scale.set(64, 16, 1);
          return sprite;
        }}
        nodeThreeObjectExtend={true}
      />
    </>
  );
}

export default function Graph3DClient(props: Graph3DClientProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 420], fov: 50 }}
      dpr={[1, 2]}
      onPointerMissed={(event) => {
        if (event.button !== 0) return;
        props.onBackgroundClick?.();
      }}
    >
      <GraphScene {...props} />
    </Canvas>
  );
}
