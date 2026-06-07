import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DagGraph, DagNode, DagEdge } from '../../models';

@Component({
  selector: 'app-dag-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #container class="dag-container">
      <svg #svg class="dag-svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        <g *ngIf="graph">
          <line
            *ngFor="let edge of graph.edges"
            [attr.x1]="getNodeX(edge.source)"
            [attr.y1]="getNodeY(edge.source)"
            [attr.x2]="getNodeX(edge.target)"
            [attr.y2]="getNodeY(edge.target)"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
          <g
            *ngFor="let node of graph.nodes"
            [attr.transform]="'translate(' + (node.x || 0) + ',' + (node.y || 0) + ')'"
          >
            <rect
              [attr.x]="-80"
              [attr.y]="-25"
              width="160"
              height="50"
              rx="8"
              ry="8"
              [attr.fill]="getNodeColor(node.status)"
              stroke="#e2e8f0"
              stroke-width="2"
            />
            <text
              text-anchor="middle"
              dy="5"
              fill="#fff"
              font-size="14"
              font-weight="500"
            >
              {{ node.label }}
            </text>
            <text
              text-anchor="middle"
              dy="22"
              fill="rgba(255,255,255,0.8)"
              font-size="11"
            >
              {{ getStatusText(node.status) }}
            </text>
          </g>
        </g>
      </svg>
    </div>
  `,
  styles: [`
    .dag-container {
      width: 100%;
      height: 400px;
      overflow: auto;
      background: #f8fafc;
      border-radius: 8px;
    }
    .dag-svg {
      width: 100%;
      height: 100%;
      min-width: 600px;
      min-height: 400px;
    }
  `]
})
export class DagGraphComponent implements OnChanges, AfterViewInit {
  @Input() graph?: DagGraph;
  @ViewChild('container') container!: ElementRef;
  @ViewChild('svg') svg!: ElementRef;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['graph'] && this.graph) {
      this.layoutNodes();
    }
  }

  ngAfterViewInit(): void {
    if (this.graph) {
      this.layoutNodes();
    }
  }

  private layoutNodes(): void {
    if (!this.graph) return;

    const levels = this.calculateLevels();
    const levelWidth = 200;
    const nodeHeight = 80;

    levels.forEach((levelNodes, levelIndex) => {
      levelNodes.forEach((nodeId, nodeIndex) => {
        const node = this.graph?.nodes.find(n => n.id === nodeId);
        if (node) {
          node.x = 100 + levelIndex * levelWidth;
          node.y = 50 + nodeIndex * nodeHeight + (levels.length - levelNodes.length) * nodeHeight / 2;
        }
      });
    });
  }

  private calculateLevels(): string[][] {
    if (!this.graph) return [];

    const levels: string[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    this.graph.nodes.forEach(node => {
      inDegree.set(node.id, 0);
    });

    this.graph.edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    let currentLevel = this.graph.nodes
      .filter(node => inDegree.get(node.id) === 0)
      .map(node => node.id);

    while (currentLevel.length > 0) {
      levels.push(currentLevel);
      currentLevel.forEach(id => visited.add(id));

      const nextLevel = new Set<string>();
      currentLevel.forEach(sourceId => {
        this.graph?.edges
          .filter(e => e.source === sourceId)
          .forEach(e => {
            const targetDegree = (inDegree.get(e.target) || 0) - 1;
            inDegree.set(e.target, targetDegree);
            if (targetDegree === 0 && !visited.has(e.target)) {
              nextLevel.add(e.target);
            }
          });
      });

      currentLevel = Array.from(nextLevel);
    }

    return levels;
  }

  getNodeX(nodeId: string): number {
    return this.graph?.nodes.find(n => n.id === nodeId)?.x || 0;
  }

  getNodeY(nodeId: string): number {
    return this.graph?.nodes.find(n => n.id === nodeId)?.y || 0;
  }

  getNodeColor(status?: string): string {
    const colorMap: Record<string, string> = {
      'SUCCESS': '#10b981',
      'RUNNING': '#3b82f6',
      'PENDING': '#94a3b8',
      'FAILED': '#ef4444',
      'SKIPPED': '#f59e0b'
    };
    return colorMap[status || ''] || '#94a3b8';
  }

  getStatusText(status?: string): string {
    const textMap: Record<string, string> = {
      'SUCCESS': '成功',
      'RUNNING': '执行中',
      'PENDING': '等待中',
      'FAILED': '失败',
      'SKIPPED': '跳过'
    };
    return textMap[status || ''] || '';
  }
}
