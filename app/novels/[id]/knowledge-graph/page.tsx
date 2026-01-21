'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  type: 'character' | 'world' | 'foreshadowing';
  label: string;
  data: any;
}

interface GraphData {
  nodes: GraphNode[];
  edges: Array<{ source: string; target: string; label?: string }>;
}

export default function KnowledgeGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const fgRef = useRef<any>();

  useEffect(() => {
    fetch(`/api/novels/${id}/knowledge-graph`)
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph:', err);
        setLoading(false);
      });
  }, [id]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'character': return '#3b82f6';
      case 'world': return '#10b981';
      case 'foreshadowing': return '#a855f7';
      default: return '#6b7280';
    }
  };

  const getNodeLabel = (type: string) => {
    switch (type) {
      case 'character': return '人物';
      case 'world': return '世界观';
      case 'foreshadowing': return '伏笔';
      default: return '未知';
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816] flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  const graphNodes = graphData?.nodes.map(n => ({
    ...n,
    color: getNodeColor(n.type),
    val: 10
  })) || [];

  const graphLinks = graphData?.edges.map(e => ({
    source: e.source,
    target: e.target,
    label: e.label
  })) || [];

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1816]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/novels/${id}`}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-amber-50">
            知识图谱
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 图例 */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-amber-50 mb-3">图例</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">人物 ({graphData?.nodes.filter(n => n.type === 'character').length || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">世界观 ({graphData?.nodes.filter(n => n.type === 'world').length || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">伏笔 ({graphData?.nodes.filter(n => n.type === 'foreshadowing').length || 0})</span>
              </div>
            </div>
          </div>

          {/* 图形可视化 */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            <div className="w-full h-[600px]">
              <ForceGraph2D
                ref={fgRef}
                graphData={{ nodes: graphNodes, links: graphLinks }}
                nodeLabel="label"
                nodeColor="color"
                nodeRelSize={6}
                linkColor={() => '#9ca3af'}
                linkWidth={2}
                onNodeClick={handleNodeClick}
                backgroundColor="transparent"
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.label;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                  ctx.fillStyle = node.color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                  ctx.fill();

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(label, node.x, node.y + node.val + fontSize);
                }}
              />
            </div>
          </div>

          {/* 详情面板 */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-6">
            {selectedNode ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-amber-50 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getNodeColor(selectedNode.type) }}></div>
                    {selectedNode.label}
                  </h3>
                  <button
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
                  {selectedNode.type === 'character' && (
                    <>
                      {selectedNode.data.role && (
                        <div>
                          <span className="font-medium">角色:</span> {selectedNode.data.role}
                        </div>
                      )}
                      {selectedNode.data.description && (
                        <div>
                          <span className="font-medium">描述:</span> {selectedNode.data.description}
                        </div>
                      )}
                    </>
                  )}
                  {selectedNode.type === 'world' && (
                    <>
                      {selectedNode.data.category && (
                        <div>
                          <span className="font-medium">类别:</span> {selectedNode.data.category}
                        </div>
                      )}
                      {selectedNode.data.description && (
                        <div>
                          <span className="font-medium">描述:</span> {selectedNode.data.description}
                        </div>
                      )}
                    </>
                  )}
                  {selectedNode.type === 'foreshadowing' && (
                    <>
                      {selectedNode.data.description && (
                        <div>
                          <span className="font-medium">描述:</span> {selectedNode.data.description}
                        </div>
                      )}
                      {selectedNode.data.planted_chapter && (
                        <div>
                          <span className="font-medium">埋下章节:</span> 第{selectedNode.data.planted_chapter}章
                        </div>
                      )}
                      {selectedNode.data.resolved_chapter && (
                        <div>
                          <span className="font-medium">揭示章节:</span> 第{selectedNode.data.resolved_chapter}章
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-500 py-8">
                点击节点查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
