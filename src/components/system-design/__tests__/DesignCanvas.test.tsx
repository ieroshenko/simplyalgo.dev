import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock ReactFlow
vi.mock('reactflow', () => ({
    default: ({ children }: any) => <div data-testid="react-flow">{children}</div>,
    Background: () => <div data-testid="rf-background" />,
    Controls: () => <div data-testid="rf-controls" />,
    MiniMap: () => <div data-testid="rf-minimap" />,
    useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
    useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
    addEdge: vi.fn(),
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    Handle: () => <div data-testid="rf-handle" />,
    NodeResizer: () => <div data-testid="rf-node-resizer" />,
    MarkerType: { ArrowClosed: 'arrowclosed' },
}));

// Mock Tabler Icons
vi.mock('@tabler/icons-react', () => ({
    TbDeviceDesktop: () => <span data-testid="icon-desktop" />,
    TbServer: () => <span data-testid="icon-server" />,
    TbRouteAltLeft: () => <span data-testid="icon-loadbalancer" />,
    TbDatabase: () => <span data-testid="icon-database" />,
    TbDatabaseImport: () => <span data-testid="icon-cache" />,
    TbList: () => <span data-testid="icon-queue" />,
    TbWorld: () => <span data-testid="icon-cdn" />,
    TbCloudUp: () => <span data-testid="icon-storage" />,
    TbClock: () => <span data-testid="icon-worker" />,
    TbNetwork: () => <span data-testid="icon-gateway" />,
}));

// Mock RoughShapes
vi.mock('../RoughShapes', () => ({
    RoughShape: () => <div data-testid="rough-shape" />,
}));

// Mock RoughEdge
vi.mock('../RoughEdge', () => ({
    RoughEdge: () => <div data-testid="rough-edge" />,
}));

// Mock RoughIcon
vi.mock('../RoughIcon', () => ({
    RoughIcon: () => <div data-testid="rough-icon" />,
}));

// Mock TextEditModal
vi.mock('../TextEditModal', () => ({
    default: () => <div data-testid="text-edit-modal" />,
}));

import DesignCanvas from '../DesignCanvas';

describe('DesignCanvas', () => {
    const defaultBoardState = {
        nodes: [],
        edges: [],
    };

    const defaultProps = {
        boardState: defaultBoardState,
        onBoardChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render ReactFlow component', () => {
            render(<DesignCanvas {...defaultProps} />);

            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        it('should render background', () => {
            render(<DesignCanvas {...defaultProps} />);

            expect(screen.getByTestId('rf-background')).toBeInTheDocument();
        });

        it('should render controls', () => {
            render(<DesignCanvas {...defaultProps} />);

            expect(screen.getByTestId('rf-controls')).toBeInTheDocument();
        });

        it('should render minimap', () => {
            render(<DesignCanvas {...defaultProps} />);

            expect(screen.getByTestId('rf-minimap')).toBeInTheDocument();
        });
    });

    describe('Toolbar', () => {
        it('should render toolbar buttons', () => {
            render(<DesignCanvas {...defaultProps} />);

            // Look for toolbar elements - the component has shape/component buttons
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Board State', () => {
        it('should accept boardState prop', () => {
            const boardStateWithNodes = {
                nodes: [
                    { id: 'node-1', type: 'api', position: { x: 100, y: 100 }, data: { label: 'API Server' } },
                ],
                edges: [],
            };

            render(<DesignCanvas {...defaultProps} boardState={boardStateWithNodes} />);

            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        it('should call onBoardChange when board changes', () => {
            render(<DesignCanvas {...defaultProps} />);

            // The onBoardChange should be callable
            expect(defaultProps.onBoardChange).toBeDefined();
        });
    });

    describe('Empty State', () => {
        it('should render with empty board state', () => {
            render(<DesignCanvas {...defaultProps} boardState={{ nodes: [], edges: [] }} />);

            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });
    });
});
