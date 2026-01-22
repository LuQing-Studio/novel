'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

// 完全在客户端加载 3D 图谱组件（避免 SSR / WebGL 问题）
const Graph3DClient = dynamic(() => import('./Graph3DClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">加载 3D 图谱中...</div>
    </div>
  ),
});

interface GraphNode {
  id: string;
  type: 'character' | 'world' | 'foreshadowing';
  label: string;
  data: unknown;
}

interface GraphData {
  nodes: GraphNode[];
  edges: Array<{ source: string; target: string; label?: string }>;
}

interface KnowledgeGraphClientProps {
  novelId: string;
}

export default function KnowledgeGraphClient({ novelId }: KnowledgeGraphClientProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGraph = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/novels/${novelId}/knowledge-graph`);
        const data = (await res.json()) as GraphData & { error?: string };

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load graph');
        }

        if (!cancelled) {
          setGraphData(data);
        }
      } catch (error) {
        console.error('Failed to load graph:', error);
        if (!cancelled) {
          setGraphData({ nodes: [], edges: [] });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGraph();
    return () => {
      cancelled = true;
    };
  }, [novelId]);

  const getNodeColor = (type: GraphNode['type']): string => {
    switch (type) {
      case 'character':
        return '#3b82f6';
      case 'world':
        return '#10b981';
      case 'foreshadowing':
        return '#a855f7';
      default:
        return '#6b7280';
    }
  };

  const getNodeLabel = (type: GraphNode['type']): string => {
    switch (type) {
      case 'character':
        return '人物';
      case 'world':
        return '世界观';
      case 'foreshadowing':
        return '伏笔';
      default:
        return '未知';
    }
  };

  const graphNodes = useMemo(() => {
    return (
      graphData?.nodes.map((node) => ({
        ...node,
        color: getNodeColor(node.type),
        val: 10,
      })) || []
    );
  }, [graphData]);

  const graphLinks = useMemo(() => {
    return (
      graphData?.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        label: edge.label,
      })) || []
    );
  }, [graphData]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6 flex items-center justify-center h-[600px]">
        <div className="text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  const characterCount = graphData?.nodes.filter((n) => n.type === 'character').length || 0;
  const worldCount = graphData?.nodes.filter((n) => n.type === 'world').length || 0;
  const foreshadowingCount = graphData?.nodes.filter((n) => n.type === 'foreshadowing').length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 图例 */}
      <div className="lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-amber-50 mb-3">图例</h3>
            <div className="flex gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-700 dark:text-gray-300">人物 ({characterCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-700 dark:text-gray-300">世界观 ({worldCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full" />
                <span className="text-sm text-gray-700 dark:text-gray-300">伏笔 ({foreshadowingCount})</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              拖拽旋转 · 滚轮缩放 · 点击节点聚焦 · 点击空白取消选中
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
          >
            {autoRotate ? '停止旋转' : '自动旋转'}
          </button>
        </div>
      </div>

      {/* 图形可视化 */}
      <div className="lg:col-span-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
        <div className="w-full h-[600px]">
          <Graph3DClient
            nodes={graphNodes}
            links={graphLinks}
            onNodeClick={(node) => setSelectedNode(node)}
            onBackgroundClick={() => setSelectedNode(null)}
            selectedNodeId={selectedNode?.id || null}
            autoRotate={autoRotate}
          />
        </div>
      </div>

      {/* 详情面板 */}
      <div className="lg:col-span-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
        {selectedNode ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-amber-50 flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                />
                {selectedNode.label}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {getNodeLabel(selectedNode.type)}
            </div>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              {selectedNode.type === 'character' &&
                (() => {
                  const character = selectedNode.data as {
                    status?: string;
                    description?: string;
                    personality?: string;
                  };

                  return (
                    <>
                      {character.status && (
                        <div>
                          <span className="font-medium">状态:</span> {character.status}
                        </div>
                      )}
                      {character.description && (
                        <div>
                          <span className="font-medium">描述:</span> {character.description}
                        </div>
                      )}
                      {character.personality && (
                        <div>
                          <span className="font-medium">性格:</span> {character.personality}
                        </div>
                      )}
                    </>
                  );
                })()}

              {selectedNode.type === 'world' &&
                (() => {
                  const world = selectedNode.data as {
                    category?: string;
                    title?: string;
                    content?: string;
                  };

                  return (
                    <>
                      {world.category && (
                        <div>
                          <span className="font-medium">类别:</span> {world.category}
                        </div>
                      )}
                      {world.title && (
                        <div>
                          <span className="font-medium">标题:</span> {world.title}
                        </div>
                      )}
                      {world.content && (
                        <div>
                          <span className="font-medium">内容:</span> {world.content}
                        </div>
                      )}
                    </>
                  );
                })()}

              {selectedNode.type === 'foreshadowing' &&
                (() => {
                  const foreshadowing = selectedNode.data as {
                    content?: string;
                    plantedChapter?: number;
                    plannedRevealChapter?: number;
                    revealedChapter?: number;
                  };

                  return (
                    <>
                      {foreshadowing.content && (
                        <div>
                          <span className="font-medium">内容:</span> {foreshadowing.content}
                        </div>
                      )}
                      {foreshadowing.plantedChapter && (
                        <div>
                          <span className="font-medium">埋下章节:</span> 第{foreshadowing.plantedChapter}章
                        </div>
                      )}
                      {foreshadowing.plannedRevealChapter && (
                        <div>
                          <span className="font-medium">计划揭示:</span> 第{foreshadowing.plannedRevealChapter}章
                        </div>
                      )}
                      {foreshadowing.revealedChapter && (
                        <div>
                          <span className="font-medium">实际揭示:</span> 第{foreshadowing.revealedChapter}章
                        </div>
                      )}
                    </>
                  );
                })()}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-500 py-8">点击节点查看详情</div>
        )}
      </div>
    </div>
  );
}
