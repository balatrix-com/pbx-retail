import React, { useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { PhoneCall, CornerDownRight, PhoneForwarded, Link, Repeat, PhoneOff } from 'lucide-react';

const nodeWidth = 260;
const nodeHeight = 80;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'TB' ? 'top' : 'left';
    node.sourcePosition = direction === 'TB' ? 'bottom' : 'right';

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const CustomNode = ({ data, targetPosition, sourcePosition }) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-2xl bg-white border-2 ${data.borderColor} w-[260px] flex items-center gap-3 relative`}>
      <Handle 
        type="target" 
        position={targetPosition || Position.Top} 
        className="w-2 h-2 !bg-gray-400 border-none" 
      />
      <div className={`p-2.5 rounded-xl ${data.iconBgColor} ${data.iconColor}`}>
        {data.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{data.label}</div>
        <div className="text-sm font-bold text-gray-900 mt-0.5 truncate" title={data.subLabel}>{data.subLabel}</div>
      </div>
      <Handle 
        type="source" 
        position={sourcePosition || Position.Bottom} 
        className="w-2 h-2 !bg-gray-400 border-none" 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function VisualIVRFlow({ ivrName, menu }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!menu) return;

    const initialNodes = [];
    const initialEdges = [];

    initialNodes.push({
      id: 'root',
      type: 'custom',
      data: { 
        label: 'IVR Entry', 
        subLabel: ivrName || 'Main Menu', 
        icon: <PhoneCall size={20} />,
        borderColor: 'border-primary-500',
        iconBgColor: 'bg-primary-50',
        iconColor: 'text-primary-600'
      },
      position: { x: 0, y: 0 },
    });

    const traverseMenu = (menuObj, parentId) => {
      Object.entries(menuObj).forEach(([digit, action]) => {
        const nodeId = `${parentId}-${digit}`;
        
        let label = action.type;
        let subLabel = action.target || '';
        let icon = <CornerDownRight size={20} />;
        let borderColor = 'border-gray-300';
        let iconBgColor = 'bg-gray-100';
        let iconColor = 'text-gray-600';

        switch (action.type) {
            case 'extension':
                label = 'Extension';
                icon = <PhoneForwarded size={20} />;
                borderColor = 'border-blue-400';
                iconBgColor = 'bg-blue-50';
                iconColor = 'text-blue-600';
                break;
            case 'ring_group':
                label = 'Ring Group';
                icon = <PhoneForwarded size={20} />;
                borderColor = 'border-indigo-400';
                iconBgColor = 'bg-indigo-50';
                iconColor = 'text-indigo-600';
                break;
            case 'submenu':
                label = 'Submenu';
                subLabel = action.props?.greeting ? 'Has Greeting' : 'No Greeting';
                icon = <CornerDownRight size={20} />;
                borderColor = 'border-purple-400';
                iconBgColor = 'bg-purple-50';
                iconColor = 'text-purple-600';
                break;
            case 'ivr':
                label = 'Route to IVR';
                icon = <Link size={20} />;
                borderColor = 'border-emerald-400';
                iconBgColor = 'bg-emerald-50';
                iconColor = 'text-emerald-600';
                break;
            case 'external':
                label = 'External Number';
                icon = <PhoneCall size={20} />;
                borderColor = 'border-orange-400';
                iconBgColor = 'bg-orange-50';
                iconColor = 'text-orange-600';
                break;
            case 'repeat':
                label = 'Action';
                subLabel = 'Repeat Menu';
                icon = <Repeat size={20} />;
                borderColor = 'border-gray-400';
                iconBgColor = 'bg-gray-100';
                iconColor = 'text-gray-600';
                break;
            case 'hangup':
                label = 'Action';
                subLabel = 'Hangup';
                icon = <PhoneOff size={20} />;
                borderColor = 'border-red-400';
                iconBgColor = 'bg-red-50';
                iconColor = 'text-red-600';
                break;
            case 'back':
                label = 'Action';
                subLabel = 'Go Back';
                icon = <CornerDownRight size={20} className="transform rotate-180" />;
                borderColor = 'border-gray-400';
                iconBgColor = 'bg-gray-100';
                iconColor = 'text-gray-600';
                break;
            default:
                break;
        }

        initialNodes.push({
          id: nodeId,
          type: 'custom',
          data: { label, subLabel, icon, borderColor, iconBgColor, iconColor },
          position: { x: 0, y: 0 },
        });

        initialEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          label: `Press ${digit}`,
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, fillOpacity: 1 },
          labelStyle: { fill: '#475569', fontWeight: 800, fontSize: 13, fontFamily: 'inherit' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          animated: action.type === 'submenu' || action.type === 'ivr',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: '#94a3b8',
          },
        });

        if (action.type === 'submenu' && action.children) {
            traverseMenu(action.children, nodeId);
        }
      });
    };

    traverseMenu(menu, 'root');

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

  }, [menu, ivrName]);

  if (!menu || Object.keys(menu).length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8">
            <CornerDownRight className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-sm font-bold text-gray-900 mb-1">No Menu Flow</h3>
            <p className="text-sm text-gray-500 font-medium">Add options to the schema to see the visual flowchart.</p>
        </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} className="bg-white border-gray-200 shadow-sm rounded-lg" />
      </ReactFlow>
    </div>
  );
}
