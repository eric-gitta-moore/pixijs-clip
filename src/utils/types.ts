import {
  Sprite,
  Container,
  Text,
  Graphics,
  Application,
  FederatedPointerEvent,
} from "pixi.js";

// 扩展Text类型以包含lastClickTime属性
declare module "pixi.js" {
  interface Text {
    lastClickTime?: number;
  }
}

// 拖拽位置信息接口
export interface DragPosition {
  x: number;
  y: number;
}

// 缩放信息接口
export interface ScaleInfo {
  x: number;
  y: number;
}

// 控制点位置接口
export interface ControlPoint {
  x: number;
  y: number;
}

// 中心点接口
export interface CenterPoint {
  x: number;
  y: number;
}

// 时间轴接口
export interface TimelineData {
  duration: number;
  currentTime: number;
}

// 视频容器接口（扩展Sprite包含视频元素和时间轴数据）
export interface VideoContainer extends Sprite {
  videoElement: HTMLVideoElement;
  timeline: TimelineData;
  lastClickTime?: number;
}

// 选中对象类型
export type SelectableObject = Sprite | Text | VideoContainer | null;
