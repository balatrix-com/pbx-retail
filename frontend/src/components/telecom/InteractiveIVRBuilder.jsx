import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { PhoneCall, CornerDownRight, PhoneForwarded, Link, Repeat, PhoneOff, Trash2, Settings, Plus, X, KeySquare } from 'lucide-react';

const ActionPalette = () => {
  const onDragStart = (event, nodeType, actionType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('actionType', actionType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const actions = [
    { type: 'extension', label: 'Extension', icon: <PhoneForwarded size={16} />, color: 'blue' },
    { type: 'ring_group', label: 'Ring Group', icon: <PhoneForwarded size={16} />, color: 'indigo' },
    { type: 'submenu', label: 'Submenu', icon: <CornerDownRight size={16} />, color: 'purple' },
    { type: 'ivr', label: 'Route to IVR', icon: <Link size={16} />, color: 'emerald' },
    { type: 'did_forward', label: 'DID Forward', icon: <PhoneCall size={16} />, color: 'orange' },
    { type: 'external', label: 'External No.', icon: <PhoneCall size={16} />, color: 'orange' },
    { type: 'back', label: 'Go Back', icon: <CornerDownRight size={16} className="transform rotate-180" />, color: 'gray' },
    { type: 'repeat', label: 'Repeat Menu', icon: <Repeat size={16} />, color: 'gray' },
    { type: 'hangup', label: 'Hangup', icon: <PhoneOff size={16} />, color: 'red' },
  ];

  return (
    <div className="w-64 bg-white border-r-2 border-gray-300 shadow-[2px_0_10px_-3px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-3 overflow-y-auto relative z-10">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Actions</div>
      <p className="text-xs text-gray-400 mb-2">Drag blocks onto the canvas.</p>
      {actions.map((act) => (
        <div
          key={act.type}
          className={`flex items-center gap-3 p-3 bg-${act.color}-50 text-${act.color}-700 border border-${act.color}-200 rounded-xl cursor-grab active:cursor-grabbing hover:shadow-sm transition-all`}
          onDragStart={(event) => onDragStart(event, 'actionNode', act.type)}
          draggable
        >
          {act.icon}
          <span className="text-sm font-bold">{act.label}</span>
        </div>
      ))}
    </div>
  );
};

const ActionNode = ({ data, selected }) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-2xl bg-white border-2 ${selected ? 'border-primary-500 ring-4 ring-primary-50' : data.borderColor} w-[260px] flex items-center gap-3 relative transition-all`}>
      <Handle type="target" position={Position.Top} className="!w-6 !h-6 !min-w-[24px] !min-h-[24px] !bg-gray-400 border-2 border-white hover:scale-125 hover:!bg-primary-400 transition-transform cursor-crosshair shadow-sm" />
      <div className={`p-2.5 rounded-xl ${data.iconBgColor} ${data.iconColor}`}>
        {data.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{data.label}</div>
        <div className="text-sm font-bold text-gray-900 mt-0.5 truncate" title={data.subLabel || 'Unconfigured'}>
          {data.subLabel || <span className="text-red-400 italic">Unconfigured</span>}
        </div>
      </div>
      {data.actionType === 'submenu' && (
        <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !min-w-[24px] !min-h-[24px] !bg-primary-500 border-2 border-white hover:scale-125 hover:!bg-primary-400 transition-transform cursor-crosshair shadow-sm" />
      )}
    </div>
  );
};

const RootNode = ({ data, selected }) => {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-2xl bg-white border-2 ${selected ? 'border-primary-600' : 'border-gray-800'} w-[260px] flex items-center gap-3 relative`}>
      <div className="p-2.5 rounded-xl bg-gray-900 text-white">
        <PhoneCall size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">IVR Entry</div>
        <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !min-w-[24px] !min-h-[24px] !bg-primary-500 border-2 border-white hover:scale-125 hover:!bg-primary-400 transition-transform cursor-crosshair shadow-sm" />
    </div>
  );
};

const nodeTypes = {
  actionNode: ActionNode,
  rootNode: RootNode,
};

const getActionDetails = (type) => {
    switch (type) {
        case 'extension': return { label: 'Extension', icon: <PhoneForwarded size={20} />, borderColor: 'border-blue-400', iconBgColor: 'bg-blue-50', iconColor: 'text-blue-600' };
        case 'ring_group': return { label: 'Ring Group', icon: <PhoneForwarded size={20} />, borderColor: 'border-indigo-400', iconBgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' };
        case 'submenu': return { label: 'Submenu', icon: <CornerDownRight size={20} />, borderColor: 'border-purple-400', iconBgColor: 'bg-purple-50', iconColor: 'text-purple-600' };
        case 'ivr': return { label: 'Route to IVR', icon: <Link size={20} />, borderColor: 'border-emerald-400', iconBgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' };
        case 'did_forward':
        case 'forward': return { label: 'DID Forward', icon: <PhoneCall size={20} />, borderColor: 'border-orange-400', iconBgColor: 'bg-orange-50', iconColor: 'text-orange-600' };
        case 'external': return { label: 'External No.', icon: <PhoneCall size={20} />, borderColor: 'border-orange-400', iconBgColor: 'bg-orange-50', iconColor: 'text-orange-600' };
        case 'back': return { label: 'Action', icon: <CornerDownRight size={20} className="transform rotate-180" />, borderColor: 'border-gray-400', iconBgColor: 'bg-gray-100', iconColor: 'text-gray-600', subLabel: 'Go Back' };
        case 'repeat': return { label: 'Action', icon: <Repeat size={20} />, borderColor: 'border-gray-400', iconBgColor: 'bg-gray-100', iconColor: 'text-gray-600', subLabel: 'Repeat Menu' };
        case 'hangup': return { label: 'Action', icon: <PhoneOff size={20} />, borderColor: 'border-red-400', iconBgColor: 'bg-red-50', iconColor: 'text-red-600', subLabel: 'Hangup' };
        default: return { label: 'Unknown', icon: <PhoneCall size={20} />, borderColor: 'border-gray-300', iconBgColor: 'bg-gray-100', iconColor: 'text-gray-600' };
    }
};

let id = 0;
const getId = () => `dndnode_${id++}`;

const InteractiveBuilderCore = ({ ivrName, resources, initialMenu, onChange }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const getSubLabel = (actionType, target, props) => {
      if (!target) return 'Unconfigured';
      if (actionType === 'extension') return target;
      if (actionType === 'ring_group') {
          const rg = resources.ringGroups?.find(r => r.id === target);
          return rg ? `${rg.name} (Ext: ${rg.extensionNumber})` : target;
      }
      if (actionType === 'ivr') {
          const ivr = resources.ivrs?.find(i => i.id === target);
          return ivr ? ivr.name : target;
      }
      if (actionType === 'external') {
          return target; // raw number
      }
      if (actionType === 'did_forward' || actionType === 'forward') {
          const df = resources.didForwards?.find(d => d.id === target);
          return df ? `${df.name} (${df.destinationNumber})` : target;
      }
      if (actionType === 'submenu') {
          return props?.greeting ? 'Has Greeting' : 'No Greeting';
      }
      return target || 'Unconfigured';
  };

  // Initialize
  useEffect(() => {
    if (!initialMenu || Object.keys(initialMenu).length === 0) {
      setNodes([{
        id: 'root',
        type: 'rootNode',
        data: { label: ivrName || 'Main Menu', actionType: 'submenu' }, // root acts as a submenu source
        position: { x: 250, y: 50 },
      }]);
      setEdges([]);
      return;
    }

    const initialNodes = [];
    const initialEdges = [];

    initialNodes.push({
      id: 'root',
      type: 'rootNode',
      data: { label: ivrName || 'Main Menu', actionType: 'submenu' },
      position: { x: 0, y: 0 },
    });

    const traverseMenu = (menuObj, parentId) => {
      Object.entries(menuObj).forEach(([digit, action]) => {
        const nodeId = `${parentId}-${digit}`;
        
        const details = getActionDetails(action.type);
        
        const subLabel = getSubLabel(action.type, action.target, action.props);

        initialNodes.push({
          id: nodeId,
          type: 'actionNode',
          data: { 
              actionType: action.type,
              target: action.target || '',
              props: action.props || {},
              ...details,
              subLabel
          },
          position: { x: 0, y: 0 },
        });

        initialEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          data: { digit },
          label: `Press ${digit}`,
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, fillOpacity: 1 },
          labelStyle: { fill: '#475569', fontWeight: 800, fontSize: 13, fontFamily: 'inherit' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#94a3b8' },
        });

        if (action.type === 'submenu' && action.children) {
            traverseMenu(action.children, nodeId);
        }
      });
    };

    traverseMenu(initialMenu, 'root');

    // Layout using dagre
    const nodeWidth = 260;
    const nodeHeight = 80;
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 100 });

    initialNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    initialEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    initialNodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.position = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      };
    });

    setNodes(initialNodes);
    setEdges(initialEdges);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialMenu), ivrName, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => {
        // Instead of window.prompt, we open the custom modal
        setPendingConnection(params);
    },
    []
  );

  const confirmConnection = (digit) => {
      if (!pendingConnection) return;
      
      const newEdge = {
          ...pendingConnection,
          id: `e-${pendingConnection.source}-${pendingConnection.target}`,
          data: { digit },
          label: `Press ${digit}`,
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, fillOpacity: 1 },
          labelStyle: { fill: '#475569', fontWeight: 800, fontSize: 13, fontFamily: 'inherit' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#94a3b8' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setPendingConnection(null);
  };

  const cancelConnection = () => {
      setPendingConnection(null);
  };

  const onEdgeClick = useCallback((event, edge) => {
      event.stopPropagation();
      setPendingDelete(edge);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const actionType = event.dataTransfer.getData('actionType');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const details = getActionDetails(actionType);
      
      const newNode = {
        id: getId(),
        type,
        position,
        data: { 
            actionType,
            target: '',
            props: {},
            ...details
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = (event, node) => {
      setSelectedNode(node);
  };

  const onPaneClick = () => {
      setSelectedNode(null);
  };

  const updateNodeData = (nodeId, newData) => {
      setNodes((nds) => nds.map(node => {
          if (node.id === nodeId) {
              const updatedData = { ...node.data, ...newData };
              updatedData.subLabel = getSubLabel(updatedData.actionType, updatedData.target, updatedData.props);
              return { ...node, data: updatedData };
          }
          return node;
      }));
      
      // Update selected node state to reflect in UI immediately
      setSelectedNode(prev => {
          if (prev && prev.id === nodeId) {
              const updatedData = { ...prev.data, ...newData };
              updatedData.subLabel = getSubLabel(updatedData.actionType, updatedData.target, updatedData.props);
              return { ...prev, data: updatedData };
          }
          return prev;
      });
  };

  // Convert Graph back to Backend JSON whenever nodes/edges change
  useEffect(() => {
      // Build tree from root
      const buildMenu = (parentId) => {
          const menu = {};
          const outgoingEdges = edges.filter(e => e.source === parentId);
          
          outgoingEdges.forEach(edge => {
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!targetNode || !edge.data?.digit) return;

              const action = {
                  type: targetNode.data.actionType,
              };

              if (['extension', 'ring_group', 'ivr', 'external', 'did_forward', 'forward'].includes(action.type)) {
                  action.target = targetNode.data.target;
              }

              if (action.type === 'submenu') {
                  action.props = targetNode.data.props || {};
                  action.children = buildMenu(targetNode.id);
              }

              menu[edge.data.digit] = action;
          });
          return menu;
      };

      const finalMenu = buildMenu('root');
      onChange(finalMenu);
  }, [nodes, edges, onChange]);


  return (
    <div className="flex h-[700px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <ActionPalette />
      
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
        </ReactFlow>

        {/* Digit Selection Modal */}
        {pendingConnection && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center gap-3">
                        <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                            <KeySquare size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Assign Key Route</h3>
                            <p className="text-xs font-medium text-gray-500">Select the digit the caller should press</p>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-3 gap-3">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => {
                                // Check if this digit is already used by an edge coming from the same source
                                const isUsed = edges.some(e => e.source === pendingConnection.source && e.data?.digit === digit);
                                
                                return (
                                    <button
                                        key={digit}
                                        onClick={() => confirmConnection(digit)}
                                        disabled={isUsed}
                                        className={`h-12 flex items-center justify-center text-xl font-bold rounded-xl transition-all ${
                                            isUsed 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 active:scale-95 shadow-sm'
                                        }`}
                                        title={isUsed ? `Key ${digit} is already assigned to another route` : `Assign Key ${digit}`}
                                    >
                                        {digit}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={cancelConnection}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {pendingDelete && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Delete Route</h3>
                            <p className="text-xs font-medium text-gray-500">Are you sure you want to remove this connection?</p>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center mb-6 shadow-inner">
                            <span className="font-bold text-gray-700 text-lg">{pendingDelete.label}</span>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setPendingDelete(null)}
                                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setEdges((eds) => eds.filter((e) => e.id !== pendingDelete.id));
                                    setPendingDelete(null);
                                }}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm"
                            >
                                Delete Route
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Configuration Panel */}
        {selectedNode && selectedNode.id !== 'root' && (
            <div className="absolute top-4 right-4 w-80 bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden z-10 animate-in slide-in-from-right-4 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Configure Action</h3>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-700">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Action Type</label>
                        <div className="text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            {selectedNode.data.label}
                        </div>
                    </div>

                    {selectedNode.data.actionType === 'extension' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Select Extension</label>
                            <select
                                className="w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                value={selectedNode.data.target}
                                onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                            >
                                <option value="">Select Extension...</option>
                                {resources.extensions.map(ext => (
                                    <option key={ext.id} value={ext.extensionNumber}>{ext.extensionNumber} - {ext.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedNode.data.actionType === 'ring_group' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Select Ring Group</label>
                            <select
                                className="w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                value={selectedNode.data.target}
                                onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                            >
                                <option value="">Select Ring Group...</option>
                                {resources.ringGroups.map(rg => (
                                    <option key={rg.id} value={rg.id}>{rg.name} (Ext: {rg.extensionNumber})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedNode.data.actionType === 'ivr' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Select IVR</label>
                            <select
                                className="w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                value={selectedNode.data.target}
                                onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                            >
                                <option value="">Select IVR...</option>
                                {resources.ivrs.map(ivr => (
                                    <option key={ivr.id} value={ivr.id}>{ivr.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(selectedNode.data.actionType === 'did_forward' || selectedNode.data.actionType === 'forward') && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Select DID Forward</label>
                            <select
                                className="w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                value={selectedNode.data.target}
                                onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                            >
                                <option value="">Select DID Forward...</option>
                                {resources.didForwards?.map(df => (
                                    <option key={df.id} value={df.id}>{df.name} ({df.destinationNumber})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedNode.data.actionType === 'external' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">External Number</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                placeholder="+1234567890"
                                value={selectedNode.data.target || ''}
                                onChange={(e) => updateNodeData(selectedNode.id, { target: e.target.value })}
                            />
                        </div>
                    )}

                    {selectedNode.data.actionType === 'submenu' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Submenu Greeting</label>
                            <select
                                className="w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                value={selectedNode.data.props?.greeting || ''}
                                onChange={(e) => updateNodeData(selectedNode.id, { props: { ...selectedNode.data.props, greeting: e.target.value } })}
                            >
                                <option value="">-- No Audio --</option>
                                {resources.audioFiles.map(file => (
                                    <option key={file.id} value={file.storageUrl}>{file.name}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-400">Drag handles from the bottom of this node to add options to the submenu.</p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                        <button 
                            className="w-full inline-flex justify-center items-center rounded-lg px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            onClick={() => {
                                setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
                                setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                                setSelectedNode(null);
                            }}
                        >
                            <Trash2 size={16} className="mr-2" /> Delete Node
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default function InteractiveIVRBuilder(props) {
  return (
    <ReactFlowProvider>
      <InteractiveBuilderCore {...props} />
    </ReactFlowProvider>
  );
}
