import { Graphics, FederatedPointerEvent, Text, Sprite, Application } from 'pixi.js';
import { DragPosition, ScaleInfo, SelectableObject } from '../utils/types';

export class DragManager {
  private app: Application;
  private isDraggingState = false;
  private dragTarget: Graphics | null = null;
  private dragStartPosition: DragPosition = { x: 0, y: 0 };
  private dragStartScale: ScaleInfo = { x: 1, y: 1 };
  private imageIsDraggingState = false;
  private dragOffset: DragPosition = { x: 0, y: 0 };
  private getSelectedObject: () => SelectableObject;
  private updateSelectionBox: () => void;

  constructor(
    app: Application,
    getSelectedObject: () => SelectableObject,
    updateSelectionBox: () => void
  ) {
    this.app = app;
    this.getSelectedObject = getSelectedObject;
    this.updateSelectionBox = updateSelectionBox;
  }

  // 图片或对象拖动相关方法
  public isImageDragging(): boolean {
    return this.imageIsDraggingState;
  }

  public isDragging(): boolean {
    return this.isDraggingState;
  }

  // 处理控制点拖拽开始
  public onDragStart(event: FederatedPointerEvent): void {
    const currentSelectedObject = this.getSelectedObject();
    if (!currentSelectedObject) return;
    
    // 如果已经在进行其他操作，不要开始
    if (this.imageIsDraggingState) return;
    
    this.isDraggingState = true;
    this.dragTarget = event.currentTarget as Graphics;
    this.dragStartPosition = { x: event.global.x, y: event.global.y };
    
    if (currentSelectedObject instanceof Sprite) {
      this.dragStartScale = {
        x: currentSelectedObject.scale.x,
        y: currentSelectedObject.scale.y
      };
    } else if (currentSelectedObject instanceof Text) {
      // 文本缩放基于fontSize
      const fontSize = Number(currentSelectedObject.style.fontSize);
      this.dragStartScale = {
        x: fontSize,
        y: fontSize
      };
    }
    
    // 在v7+中，我们需要在stage上添加事件监听器才能跟踪鼠标移出元素的情况
    this.app.stage.on('pointermove', this.onDragMove.bind(this));
    this.app.stage.on('pointerup', this.onDragEnd.bind(this));
    this.app.stage.on('pointerupoutside', this.onDragEnd.bind(this));
    
    // 防止事件冒泡
    event.stopPropagation();
  }

  private onDragEnd(event: FederatedPointerEvent): void {
    if (!this.isDraggingState) return;
    
    this.isDraggingState = false;
    this.dragTarget = null;

    // 移除全局事件监听
    this.app.stage.off('pointermove', this.onDragMove.bind(this));
    this.app.stage.off('pointerup', this.onDragEnd.bind(this));
    this.app.stage.off('pointerupoutside', this.onDragEnd.bind(this));
  }

  private onDragMove(event: FederatedPointerEvent): void {
    const currentSelectedObject = this.getSelectedObject();
    if (!this.isDraggingState || !currentSelectedObject || !this.dragTarget) return;

    const newPosition = { x: event.global.x, y: event.global.y };
    const dx = newPosition.x - this.dragStartPosition.x;
    const dy = newPosition.y - this.dragStartPosition.y;

    // 获取控制点的索引
    const controlLabel = this.dragTarget.label as string;
    if (controlLabel.includes('control-point')) {
      const index = parseInt(controlLabel.split('-')[2]);
      
      if (index >= 0 && index < 4) {
        if (currentSelectedObject instanceof Sprite) {
          // 根据控制点位置决定如何缩放
          let scaleX = this.dragStartScale.x;
          let scaleY = this.dragStartScale.y;
          
          // 缩放因子
          const SCALE_FACTOR = 0.01;
          
          if (index === 0 || index === 3) { // 左侧控制点
            scaleX = this.dragStartScale.x - dx * SCALE_FACTOR;
          }
          if (index === 1 || index === 2) { // 右侧控制点
            scaleX = this.dragStartScale.x + dx * SCALE_FACTOR;
          }
          if (index === 0 || index === 1) { // 上方控制点
            scaleY = this.dragStartScale.y - dy * SCALE_FACTOR;
          }
          if (index === 2 || index === 3) { // 下方控制点
            scaleY = this.dragStartScale.y + dy * SCALE_FACTOR;
          }

          // 应用缩放，确保不会太小
          currentSelectedObject.scale.set(
            Math.max(0.1, scaleX),
            Math.max(0.1, scaleY)
          );
        } else if (currentSelectedObject instanceof Text) {
          // 对于文本，我们调整fontSize来实现缩放
          // 缩放因子
          const TEXT_SCALE_FACTOR = 0.5;
          
          // 基于拖动距离调整大小
          let newSize = Number(this.dragStartScale.x);
          
          // 根据拖动方向调整大小
          if (index === 0 || index === 3) { // 左侧控制点
            newSize -= dx * TEXT_SCALE_FACTOR;
          }
          if (index === 1 || index === 2) { // 右侧控制点
            newSize += dx * TEXT_SCALE_FACTOR;
          }
          if (index === 0 || index === 1) { // 上方控制点
            newSize -= dy * TEXT_SCALE_FACTOR;
          }
          if (index === 2 || index === 3) { // 下方控制点
            newSize += dy * TEXT_SCALE_FACTOR;
          }
          
          // 确保字体大小合理
          newSize = Math.max(8, Math.min(72, newSize));
          
          // 更新文本样式
          currentSelectedObject.style.fontSize = newSize;
        }

        // 更新选择框
        this.updateSelectionBox();
      }
    }
  }

  // 设置对象拖动
  public setupObjectDrag(object: Sprite | Text): void {
    if (!object) return;
    
    // 确保设置了正确的交互模式
    object.eventMode = 'static';
    object.cursor = 'move';
    
    // 移除之前可能存在的监听器
    object.off('pointerdown');
    
    // 添加新的鼠标按下事件
    object.on('pointerdown', (event: FederatedPointerEvent) => {
      console.log('对象被点击，开始拖动');
      
      // 如果其他操作正在进行中，不要开始拖动
      if (this.isDraggingState) return;
      
      // 标记为拖动状态
      this.imageIsDraggingState = true;
      
      // 计算鼠标指针与对象中心的偏移
      this.dragOffset = {
        x: event.global.x - object.x,
        y: event.global.y - object.y
      };
      
      // 在v7+中，我们需要在stage上添加事件监听器才能跟踪鼠标移出元素的情况
      if (object instanceof Sprite) {
        this.app.stage.on('pointermove', this.onImageDragMove.bind(this));
        this.app.stage.on('pointerup', this.onImageDragEnd.bind(this));
        this.app.stage.on('pointerupoutside', this.onImageDragEnd.bind(this));
      } else {
        this.app.stage.on('pointermove', this.onTextDragMove.bind(this));
        this.app.stage.on('pointerup', this.onTextDragEnd.bind(this));
        this.app.stage.on('pointerupoutside', this.onTextDragEnd.bind(this));
      }
      
      // 防止事件冒泡
      event.stopPropagation();
    });
  }

  // 处理图片拖动结束
  private onImageDragEnd(event: FederatedPointerEvent): void {
    console.log('拖动结束');
    
    // 如果不是在拖动状态，直接返回
    if (!this.imageIsDraggingState) return;
    
    // 重置拖动状态
    this.imageIsDraggingState = false;
    
    // 移除全局事件监听
    this.app.stage.off('pointermove', this.onImageDragMove.bind(this));
    this.app.stage.off('pointerup', this.onImageDragEnd.bind(this));
    this.app.stage.off('pointerupoutside', this.onImageDragEnd.bind(this));
  }

  // 处理图片拖动中
  private onImageDragMove(event: FederatedPointerEvent): void {
    const currentSelectedObject = this.getSelectedObject();
    // 如果不是在拖动状态或没有当前选中对象，直接返回
    if (!this.imageIsDraggingState || !currentSelectedObject) {
      console.log('不在拖动状态或没有当前精灵');
      return;
    }
    
    console.log('拖动中', event.global.x, event.global.y);
    
    // 更新对象位置
    currentSelectedObject.x = event.global.x - this.dragOffset.x;
    currentSelectedObject.y = event.global.y - this.dragOffset.y;
    
    // 更新选择框
    this.updateSelectionBox();
  }

  // 文本拖动处理
  private onTextDragMove(event: FederatedPointerEvent): void {
    const currentSelectedObject = this.getSelectedObject();
    if (!this.imageIsDraggingState || !currentSelectedObject || !(currentSelectedObject instanceof Text)) {
      return;
    }
    
    console.log('文本拖动中', event.global.x, event.global.y);
    
    // 更新文本位置
    currentSelectedObject.x = event.global.x - this.dragOffset.x;
    currentSelectedObject.y = event.global.y - this.dragOffset.y;
    
    // 更新选择框
    this.updateSelectionBox();
  }
  
  // 文本拖动结束
  private onTextDragEnd(event: FederatedPointerEvent): void {
    console.log('文本拖动结束');
    
    // 如果不是在拖动状态，直接返回
    if (!this.imageIsDraggingState) return;
    
    // 重置拖动状态
    this.imageIsDraggingState = false;
    
    // 移除全局事件监听
    this.app.stage.off('pointermove', this.onTextDragMove.bind(this));
    this.app.stage.off('pointerup', this.onTextDragEnd.bind(this));
    this.app.stage.off('pointerupoutside', this.onTextDragEnd.bind(this));
  }
} 