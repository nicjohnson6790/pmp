import type { DrawingDocument } from './drawingTypes'
import { identityTransform } from './drawingTypes'

export const sampleTileDocument: DrawingDocument = {
  version: 1,
  width: 1414,
  height: 1000,
  background: '#FFFFFF',
  nodes: [
    {
      id: 'terrain',
      type: 'group',
      name: 'Terrain',
      transform: identityTransform(),
      children: [
        {
          id: 'river',
          type: 'shape',
          shapeType: 'brush',
          name: 'River bend',
          transform: identityTransform(),
          style: {
            stroke: '#4C91B6',
            strokeWidth: 72,
          },
          points: [
            { x: -80, y: 680 },
            { x: 160, y: 620 },
            { x: 360, y: 660 },
            { x: 610, y: 570 },
            { x: 880, y: 610 },
            { x: 1110, y: 520 },
            { x: 1510, y: 560 },
          ],
        },
        {
          id: 'field',
          type: 'shape',
          shapeType: 'polygon',
          name: 'North field',
          transform: identityTransform(),
          style: {
            fill: '#88A85C',
            stroke: '#567064',
            strokeWidth: 8,
          },
          points: [
            { x: 120, y: 110 },
            { x: 590, y: 80 },
            { x: 700, y: 360 },
            { x: 210, y: 420 },
          ],
        },
      ],
    },
    {
      id: 'settlement',
      type: 'group',
      name: 'Settlement',
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      children: [
        {
          id: 'road',
          type: 'shape',
          shapeType: 'polyline',
          name: 'Market road',
          transform: identityTransform(),
          style: {
            stroke: '#7F6A4A',
            strokeWidth: 28,
          },
          points: [
            { x: 250, y: 760 },
            { x: 420, y: 690 },
            { x: 620, y: 710 },
            { x: 760, y: 650 },
            { x: 930, y: 690 },
          ],
        },
        {
          id: 'market',
          type: 'shape',
          shapeType: 'circle',
          name: 'Market green',
          transform: identityTransform(),
          style: {
            fill: '#DFF7EA',
            stroke: '#12684D',
            strokeWidth: 10,
          },
          points: [
            { x: 765, y: 640 },
            { x: 850, y: 640 },
          ],
        },
      ],
    },
  ],
}
