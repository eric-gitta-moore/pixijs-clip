import { FederatedPointerEvent, Application } from 'pixi.js';
import { CenterPoint, SelectableObject } from '../utils/types';

export class RotationManager {
  private app: Application;
  private isRotatingState = false;
  private rotationStartAngle = 0;
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

  public isRotating(): boolean {
    return this.isRotatingState;
  }

  public onRotateStart(event: FederatedPointerEvent): void {
    const currentSelectedObject = this.getSelectedObject();
    if (!currentSelectedObject) return;
    
    console.log('开始旋转');
    
    this.isRotatingState = true;
    
    // 获取对象中心点
    const bounds = currentSelectedObject.getBounds();
    const center: CenterPoint = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
    
    // 计算初始角度
    this.rotationStartAngle = Math.atan2(
      event.global.y - center.y,
      event.global.x - center.x
    );
    
    // 记住对象当前的旋转
    const objectStartRotation = currentSelectedObject.rotation;

    // 在v7+中，我们需要在stage上添加事件监听器才能跟踪鼠标移出元素的情况
    this.app.stage.on('pointermove', (e) => this.onRotateMove(e, center, objectStartRotation));
    this.app.stage.on('pointerup', this.onRotateEnd.bind(this));
    this.app.stage.on('pointerupoutside', this.onRotateEnd.bind(this));
    
    // 防止事件冒泡
    event.stopPropagation();
  }

  private onRotateEnd(event: FederatedPointerEvent): void {
    console.log('旋转结束');
    
    if (!this.isRotatingState) return;
    
    this.isRotatingState = false;

    // 移除全局事件监听
    this.app.stage.off('pointermove');
    this.app.stage.off('pointerup', this.onRotateEnd.bind(this));
    this.app.stage.off('pointerupoutside', this.onRotateEnd.bind(this));
  }

  private onRotateMove(event: FederatedPointerEvent, center: CenterPoint, startRotation: number): void {
    const currentSelectedObject = this.getSelectedObject();
    if (!this.isRotatingState || !currentSelectedObject) return;

    console.log('旋转中');
    
    // 计算当前角度
    const currentAngle = Math.atan2(
      event.global.y - center.y,
      event.global.x - center.x
    );

    // 计算角度差
    const deltaAngle = currentAngle - this.rotationStartAngle;

    // 应用旋转
    currentSelectedObject.rotation = startRotation + deltaAngle;

    // 更新选择框
    this.updateSelectionBox();
  }
} 