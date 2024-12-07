'use client'

import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  NodeProps,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
  getRectOfNodes,
  getTransformForBounds,
  PanOnScrollMode,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { PlusCircle, Trash2, Copy, Send, Download, Loader2, Share2, Save, Share, Cloud, CloudUpload, Database, Maximize2, History, Check } from 'lucide-react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { getAIResponse } from '@/app/actions/chat'
import { toPng } from 'html-to-image'
import ReactMarkdown from 'react-markdown'
import { NodeData, ChatMessage, TreeNode } from '@/types/chat'
import { buildChatContext } from '@/lib/chat-context'
import { ulid } from 'ulid'
import { useChat } from '@/lib/hooks/useChat'
import { saveFlow } from '@/app/actions/flow'
import { ConversationList } from './conversation-list'
import { getConversationFlow } from '@/app/actions/flow'

const NODE_WIDTH = 500
const GRID_SPACING_X = 512
const VERTICAL_SPACING = 50

type HighlightInfo = {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

const buildTree = (nodes: Node[], edges: Edge[]): TreeNode => {
  const nodeMap: { [key: string]: TreeNode } = {}
  nodes.forEach(node => {
    nodeMap[node.id] = { id: node.id, children: [], width: 1 }
  })

  edges.forEach(edge => {
    const parent = nodeMap[edge.source]
    const child = nodeMap[edge.target]
    if (parent && child) {
      parent.children.push(child)
    }
  })

  const calculateWidths = (node: TreeNode): number => {
    if (node.children.length === 0) return 1
    node.width = node.children.reduce((sum, child) => sum + calculateWidths(child), 0)
    return node.width
  }

  const root = nodeMap['0']
  calculateWidths(root)
  return root
}

const positionNodes = (tree: TreeNode, x: number, y: number, nodes: Node[], edges: Edge[]): Node[] => {
  const node = nodes.find(n => n.id === tree.id)
  if (node) {
    node.position = { x, y }
  }

  let currentX = x - (tree.width - 1) * GRID_SPACING_X / 2
  tree.children.forEach(child => {
    const childWidth = child.width
    const childX = currentX + (childWidth - 1) * GRID_SPACING_X / 2
    const parentNode = nodes.find(n => n.id === tree.id)
    const childNode = nodes.find(n => n.id === child.id)
    if (parentNode && childNode) {
      const parentHeight = parentNode.data.height || 0
      positionNodes(child, childX, y + parentHeight + VERTICAL_SPACING, nodes, edges)
    }
    currentX += childWidth * GRID_SPACING_X
  })

  return nodes
}

const initialNodes: Node[] = [
  { id: '0', data: { input: 'Welcome to BrainFlowGPT!', response: 'Your are wandering in the graph of knowledge, so does the chat! You can fork the conversation whenever you like.', height: 0 }, position: { x: 0, y: 0 }, type: 'chatNode' },
]

const initialEdges: Edge[] = []

const extractBoldText = (markdown: string): string[] => {
  const boldPattern = /\*\*(.*?)\*\*/g;
  const matches = [...markdown.matchAll(boldPattern)];
  return matches.map(match => match[1]);
}

function ChatNode({ data, id }: NodeProps) {
  const [showAddButton, setShowAddButton] = useState(false)
  const [showDeleteButton, setShowDeleteButton] = useState(false)
  const [showCopyButton, setShowCopyButton] = useState(false)
  const [input, setInput] = useState(data.input)
  const [response, setResponse] = useState(data.response)
  const [isSubmitted, setIsSubmitted] = useState(data?.response != null && data.response.trim() != '') // Added new state variable
  const [isLoading, setIsLoading] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const prevHeightRef = useRef<number>(data.height)
  const [boldTexts, setBoldTexts] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleAdd = () => {
    data.onAdd(id)
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      const aiResponse = await getAIResponse(input, data.context)
      setResponse(aiResponse)
      data.updateNodeData(id, { input, response: aiResponse })
      setIsSubmitted(true)
      data.setHighlightInfo({ nodeIds: new Set(), edgeIds: new Set() })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response from AI",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleDelete = () => {
    data.onDelete(id)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`Input: ${input}\nResponse: ${response}`)
    toast({
      title: "Copied to clipboard",
      description: "Node content has been copied to your clipboard.",
    })
  }

  const handleFocus = () => {
    const highlights = data.findParentChain(id)
    data.setHighlightInfo(highlights)
  }

  const handleBlur = () => {
    data.setHighlightInfo({ nodeIds: new Set(), edgeIds: new Set() })
  }

  useEffect(() => {
    if (nodeRef.current) {
      const height = nodeRef.current.offsetHeight
      if (height !== prevHeightRef.current) {
        data.updateNodeData(id, { height })
        prevHeightRef.current = height
      }
    }
  }, [id, data, input, response])

  useEffect(() => {
    if (data.input) {
      const textarea = nodeRef.current?.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }
  }, [data.input]);

  useEffect(() => {
    if (id == '0') {
      setBoldTexts([
        "Options for personal investment",
        "Book recommendations for philosophy",
        "AI tools for personal productivity",
      ])
    }
    if (id != '0' && response) {
      const extracted = extractBoldText(response);
      // Remove any trailing ":" from the extracted texts
      // Also need to deduplicate
      const uniqueExtracted = [...new Set(extracted.map(text => text.replace(/:$/, '')))];
      setBoldTexts(uniqueExtracted);
    }
  }, [response]);

  useEffect(() => {
    // Small delay to ensure the DOM is ready
    const timeoutId = setTimeout(() => {
      if (!isSubmitted && id !== '0' && textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, []) // Empty dependency array to only run on mount

  return (
    <Card
      ref={nodeRef}
      className="relative p-4 pt-8 shadow-md"
      style={{
        width: NODE_WIDTH,
        userSelect: 'text',
        cursor: 'default',
        pointerEvents: 'auto'
      }}
      onMouseEnter={() => {
        setShowAddButton(true)
        setShowDeleteButton(true)
      }}
      onMouseLeave={() => {
        setShowAddButton(false)
        setShowDeleteButton(false)
      }}
    >
      {(isSubmitted || id == '0') && (
        <div
          className="mb-2"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ userSelect: 'text', pointerEvents: 'auto' }}
        >
          <p
            className="font-bold text-lg"
            style={{
              userSelect: 'text',
              pointerEvents: 'auto',
              cursor: 'text'
            }}
          >
            {input}
          </p>
        </div>
      )}
      <div
        className="space-y-2 mb-2"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ userSelect: 'text', pointerEvents: 'auto' }}
      >
        {response && (
          <>
            <div
              className="p-2 bg-gray-100 rounded relative"
              onMouseEnter={() => setShowCopyButton(true)}
              onMouseLeave={() => setShowCopyButton(false)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ userSelect: 'text', pointerEvents: 'auto' }}
            >
              <div
                className="prose prose-sm max-w-none [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4 [&_blockquote]:mb-4 [&_pre]:mb-4"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ userSelect: 'text', pointerEvents: 'auto' }}
              >
                <ReactMarkdown>
                  {response}
                </ReactMarkdown>
              </div>
              {showCopyButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1"
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            {boldTexts && boldTexts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {boldTexts.map((text, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-sm whitespace-normal h-auto text-left break-words"
                    onClick={() => {
                      data.onAdd(id, `${text.trim()}?`);
                    }}
                  >
                    {text.trim()}?
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {id !== '0' && !isSubmitted && (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Type your message..."
            className="pr-10 resize-none text-sm min-h-[2.5rem] overflow-hidden"
            rows={1}
            style={{ userSelect: 'text', pointerEvents: 'auto' }}
          />
          <Button
            size="sm"
            className="absolute right-2 top-[50%] -translate-y-[50%] p-1 h-6 w-6 flex items-center justify-center"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}
      {id !== '0' && showDeleteButton && (
        <Button
          variant="ghost"
          size="sm" // Updated size
          className="absolute top-2 right-2 p-1 z-10" // Updated styling
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
      {showAddButton && ( // Updated line to show add button for all nodes
        <Button
          variant="outline"
          size="icon"
          className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          onClick={handleAdd}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      )}
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </Card>
  )
}

const nodeTypes = {
  chatNode: ChatNode,
}

export function EnhancedFlexibleChatFlowchartComponent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [highlightInfo, setHighlightInfo] = useState<HighlightInfo>({
    nodeIds: new Set(),
    edgeIds: new Set()
  })
  const updateRequiredRef = useRef(false)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { messages, isLoading, error, sendMessage, downloadChatAsJson, downloadFlowAsJson, importFlowFromJson, saveFlowToDb, conversationId } = useChat()
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [showHistory, setShowHistory] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  )

  const onAdd = useCallback((parentId: string, initialInput: string = '') => {
    const newNodeId = ulid()

    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentId)
      let initialX = 0
      let initialY = 0
      if (parentNode) {
        const parentChildren = edges.filter(e => e.source === parentId).length
        initialX = parentNode.position.x + (parentChildren * 100)
        initialY = parentNode.position.y + 100
      }

      const context = buildChatContext(nds, edges, parentId)

      const newNode = {
        id: newNodeId,
        data: {
          input: initialInput,
          response: '',
          height: 0,
          context
        },
        position: { x: initialX, y: initialY },
        type: 'chatNode',
      }
      return [...nds, newNode]
    })

    setEdges((eds) => [
      ...eds,
      {
        id: `e${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: 'smoothstep',
        animated: true,
      },
    ])

    updateRequiredRef.current = true

    // Auto-save after adding the new node
    // We need to wait for the state updates to complete
    setTimeout(async () => {
      try {
        setSaveState('saving')
        await saveFlowToDb(nodes, edges)
        setSaveState('saved')
      } catch (error) {
        setSaveState('idle')
        console.error('Auto-save error:', error)
        toast({
          title: "Auto-save Error",
          description: error instanceof Error ? error.message : "Failed to auto-save flow",
          variant: "destructive"
        })
      }
    }, 100)
  }, [setNodes, setEdges, edges, nodes, saveFlowToDb]) // Added dependencies

  const onDelete = useCallback((id: string) => {
    const deleteNodeAndChildren = (nodeId: string, currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } => {
      const childEdges = currentEdges.filter(edge => edge.source === nodeId)
      const childNodes = childEdges.map(edge => currentNodes.find(node => node.id === edge.target)!).filter(Boolean)

      let updatedNodes = currentNodes.filter(node => node.id !== nodeId)
      let updatedEdges = currentEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)

      childNodes.forEach(childNode => {
        const result = deleteNodeAndChildren(childNode.id, updatedNodes, updatedEdges)
        updatedNodes = result.nodes
        updatedEdges = result.edges
      })

      return { nodes: updatedNodes, edges: updatedEdges }
    }

    const { nodes: updatedNodes, edges: updatedEdges } = deleteNodeAndChildren(id, nodes, edges)
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    updateRequiredRef.current = true
  }, [nodes, edges, setNodes, setEdges])

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node))
    )
    updateRequiredRef.current = true
  }, [setNodes])

  const updateNodePositions = useCallback(() => {
    const tree = buildTree(nodes, edges)
    const updatedNodes = positionNodes(tree, 0, 0, nodes, edges)
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const updatedNode = updatedNodes.find((n) => n.id === node.id)
        return updatedNode ? { ...node, position: updatedNode.position } : node
      })
    )
    updateRequiredRef.current = false
  }, [nodes, edges, setNodes])

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node, nodes: Node[]) => {
    updateRequiredRef.current = true;
  }, []);

  useEffect(() => {
    if (updateRequiredRef.current) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateNodePositions()
        updateTimeoutRef.current = null
      }, 50) // Reduced from 100ms to 50ms
    }
  }, [nodes, edges, updateNodePositions])

  const onDownloadImage = useCallback(() => {
    const nodesBounds = getRectOfNodes(nodes)
    const SCALE_FACTOR = 2 // Increase this for higher resolution

    const transform = getTransformForBounds(
      nodesBounds,
      nodesBounds.width,
      nodesBounds.height,
      0.5,
      0.5
    )

    // Find the viewport element
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!viewport) return

    // Temporarily hide background and controls
    const background = document.querySelector('.react-flow__background') as HTMLElement
    const controls = document.querySelector('.react-flow__controls') as HTMLElement
    const panel = document.querySelector('.react-flow__panel') as HTMLElement

    if (background) background.style.display = 'none'
    if (controls) controls.style.display = 'none'
    if (panel) panel.style.display = 'none'

    toPng(viewport, {
      backgroundColor: '#ffffff',
      width: nodesBounds.width,
      height: nodesBounds.height,
      pixelRatio: 2, // Increase pixel ratio for sharper text
      style: {
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
      quality: 1, // Maximum quality
      canvasWidth: nodesBounds.width * SCALE_FACTOR,
      canvasHeight: nodesBounds.height * SCALE_FACTOR,
    })
      .then((dataUrl) => {
        const a = document.createElement('a')
        a.setAttribute('download', 'flowchart.png')
        a.setAttribute('href', dataUrl)
        a.click()
      })
      .catch((error) => {
        console.error('Error downloading image:', error)
        toast({
          title: "Error",
          description: "Failed to download image",
        })
      })
      .finally(() => {
        // Restore visibility of hidden elements
        if (background) background.style.display = 'block'
        if (controls) controls.style.display = 'block'
        if (panel) panel.style.display = 'block'
      })
  }, [nodes])

  const findParentChain = useCallback((nodeId: string): HighlightInfo => {
    const parentNodes = new Set<string>()
    const parentEdges = new Set<string>()

    const traverse = (currentId: string) => {
      parentNodes.add(currentId)
      const parentEdge = edges.find(e => e.target === currentId)
      if (parentEdge) {
        parentEdges.add(parentEdge.id)
        traverse(parentEdge.source)
      }
    }

    traverse(nodeId)
    return { nodeIds: parentNodes, edgeIds: parentEdges }
  }, [edges])

  const handleImportFlow = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const flowData = await importFlowFromJson(file)

      // Create temporary arrays to build the complete flow before setting state
      let newNodes: Node[] = []
      let newEdges: Edge[] = []

      // Create a map for quick node lookup
      const nodeMap = new Map(flowData.nodes.map(node => [node.id, node]))

      // Find root node (usually '0')
      const rootNode = flowData.nodes.find(node => node.id === '0') || flowData.nodes[0]
      if (!rootNode) throw new Error('No root node found')

      // Function to recursively add nodes and their children
      const addNodeAndChildren = (nodeId: string, processedNodes = new Set<string>()) => {
        if (processedNodes.has(nodeId)) return
        processedNodes.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) return

        // Add the current node to temporary array
        newNodes.push({
          ...node,
          type: 'chatNode',
          data: {
            input: node.data.input,
            response: node.data.response,
            height: node.data.height || 0,
            onAdd,
            onDelete,
            updateNodeData,
            setHighlightInfo,
            findParentChain,
            context: buildChatContext(flowData.nodes, flowData.edges, nodeId)
          }
        })

        // Find and add child nodes
        const childEdges = flowData.edges.filter(edge => edge.source === nodeId)
        childEdges.forEach(edge => {
          newEdges.push({
            ...edge,
            type: 'smoothstep',
            animated: true
          })
          addNodeAndChildren(edge.target, processedNodes)
        })
      }

      // Build complete arrays first
      addNodeAndChildren(rootNode.id)

      // Set state only once with complete data
      setNodes(newNodes)
      setEdges(newEdges)

      // Update positions and fit view
      setTimeout(() => {
        updateRequiredRef.current = true
        updateNodePositions()

        // Add a longer delay before fitting view to ensure nodes are positioned
        setTimeout(() => {
          if (reactFlowInstance.current) {
            reactFlowInstance.current.fitView({
              padding: 0.2,
              maxZoom: 1,
              duration: 800,
              includeHiddenNodes: false
            });
          }
        }, 500); // Increased delay to ensure nodes are properly positioned
      }, 200)

      toast({
        title: "Success",
        description: "Flow imported successfully",
      })
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import flow",
        variant: "destructive"
      })
    }

    // Reset input
    event.target.value = ''
  }, [importFlowFromJson, setNodes, setEdges, onAdd, onDelete, updateNodeData, setHighlightInfo, findParentChain, updateNodePositions])

  const handleSaveFlow = async () => {
    try {
      setSaveState('saving')
      const id = await saveFlowToDb(nodes, edges)

      toast({
        title: "Success",
        description: conversationId
          ? "Flow updated successfully"
          : "Flow saved successfully",
      })

      setSaveState('saved')
    } catch (error) {
      setSaveState('idle')
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save flow",
      })
    }
  }

  const loadConversation = useCallback(async (id: string) => {
    try {
      const result = await getConversationFlow(id)

      if (!result.success || !result.conversation) {
        toast({
          title: "Error",
          description: "Failed to load conversation",
        })
        return
      }

      const flowData = result.conversation.flowData as any

      // Create temporary arrays to build the complete flow
      let newNodes: Node[] = []
      let newEdges: Edge[] = []

      // Create a map for quick node lookup
      const nodeMap = new Map(flowData.nodes.map((node: Node) => [node.id, node]))

      // Find root node (usually '0')
      const rootNode = flowData.nodes.find((node: Node) => node.id === '0') || flowData.nodes[0]
      if (!rootNode) throw new Error('No root node found')

      // Function to recursively add nodes and their children
      const addNodeAndChildren = (nodeId: string, processedNodes = new Set<string>()) => {
        if (processedNodes.has(nodeId)) return
        processedNodes.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) return

        // Add the current node to temporary array
        newNodes.push({
          ...node,
          type: 'chatNode',
          data: {
            ...node.data,
            onAdd,
            onDelete,
            updateNodeData,
            setHighlightInfo,
            findParentChain,
            context: buildChatContext(flowData.nodes, flowData.edges, nodeId)
          }
        })

        // Find and add child nodes
        const childEdges = flowData.edges.filter((edge: Edge) => edge.source === nodeId)
        childEdges.forEach((edge: Edge) => {
          newEdges.push({
            ...edge,
            type: 'smoothstep',
            animated: true
          })
          addNodeAndChildren(edge.target, processedNodes)
        })
      }

      // Build complete arrays first
      addNodeAndChildren(rootNode.id)

      // Set state with complete data
      setNodes(newNodes)
      setEdges(newEdges)

      // Update positions
      updateRequiredRef.current = true
      updateNodePositions()

      // Fit view after a short delay
      setTimeout(() => {
        if (reactFlowInstance.current) {
          reactFlowInstance.current.fitView({
            padding: 0.2,
            maxZoom: 1,
            duration: 800,
          })
        }
      }, 100)

      toast({
        title: "Success",
        description: "Conversation loaded successfully",
      })
    } catch (error) {
      console.error('Load error:', error)
      toast({
        title: "Error",
        description: "Failed to load conversation",
      })
    }
  }, [setNodes, setEdges, onAdd, onDelete, updateNodeData, setHighlightInfo, findParentChain, updateNodePositions])

  useEffect(() => {
    // If we're in 'saved' state and nodes change, switch back to 'idle'
    if (saveState === 'saved') {
      setSaveState('idle')
    }
  }, [nodes, edges]) // Watch both nodes and edges for changes

  return (
    <div className="flex h-full">
      <div className={`flex-1 ${showHistory ? 'border-r' : ''}`}>
        <div className="w-full h-[66vh] rounded-lg my-10 shadow-lg">
          <ReactFlow
            ref={reactFlowInstance}
            nodes={nodes.map((node) => ({
              ...node,
              draggable: false,
              selectable: false,
              data: {
                ...node.data,
                onAdd,
                onDelete,
                updateNodeData,
                setHighlightInfo,
                findParentChain
              },
              className: highlightInfo.nodeIds.has(node.id) ? 'highlight-node' : undefined
            }))}
            edges={edges.map(edge => ({
              ...edge,
              className: highlightInfo.edgeIds.has(edge.id) ? 'highlight-edge' : undefined
            }))}
            onInit={instance => reactFlowInstance.current = instance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ maxZoom: 1 }}
            minZoom={0.1}
            maxZoom={4}
            zoomOnScroll={false}
            panOnScroll={true}
            panOnScrollMode={PanOnScrollMode.Free}
            selectNodesOnDrag={false}
            preventScrolling={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={[1, 2]}
            panActivationKeyCode={"Alt"}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <Panel position="top-right" className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadImage}
                className="flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share as PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveFlow}
                disabled={saveState === 'saving' || saveState === 'saved'}
                className="flex items-center gap-2 min-w-[100px] justify-center"
              >
                {saveState === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saveState === 'saved' ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Saved
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-4 w-4" />
                    Save Flow
                  </>
                )}
              </Button>
            </Panel>
            <style>
              {`
                .highlight-node {
                  border: 1px solid #ff9f82 !important;
                }
                .highlight-edge {
                  stroke: #ff0000 !important;
                  stroke-width: 2px !important;
                }

                .react-flow__handle {
                  cursor: pointer !important;
                }

                .react-flow__pane {
                  pointer-events: none !important;
                }

                .react-flow__node {
                  pointer-events: all !important;
                  user-select: text !important;
                  cursor: grab !important;
                }

                .react-flow__node:active {
                  cursor: grabbing !important;
                }

                .react-flow__node .card-content {
                  cursor: default !important;
                }

                .react-flow__node button {
                  cursor: pointer !important;
                }

                .react-flow__node .prose {
                  cursor: text !important;
                }
              `}
            </style>
          </ReactFlow>
        </div>
      </div>
      {showHistory && (
        <ConversationList
          onSelect={(id) => {
            loadConversation(id)
            // Note: We're not closing the history panel anymore
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
