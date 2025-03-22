import {
  Container,
  Graphics,
  FederatedPointerEvent,
  Text,
  Sprite,
} from "pixi.js";
import { SelectableObject, ControlPoint } from "../utils/types";
import { DragManager } from "./DragManager";
import { RotationManager } from "./RotationManager";

export class SelectionManager {
  private selectionBox: Graphics;
  private controlPoints: Container;
  private currentSelectedObject: SelectableObject = null;
  private app: any; // 应用实例
  private dragManager: DragManager;
  private rotationManager: RotationManager;
  private imageContainer: Container;
  private onTextControlsUpdate: () => void;

  // 控制点大小和旋转手柄高度
  private readonly CONTROL_POINT_SIZE = 10;
  private readonly ROTATION_HANDLE_HEIGHT = 30;

  constructor(
    app: any,
    imageContainer: Container,
    selectionBox: Graphics,
    controlPoints: Container,
    dragManager: DragManager,
    rotationManager: RotationManager,
    onTextControlsUpdate: () => void
  ) {
    this.app = app;
    this.imageContainer = imageContainer;
    this.selectionBox = selectionBox;
    this.controlPoints = controlPoints;
    this.dragManager = dragManager;
    this.rotationManager = rotationManager;
    this.onTextControlsUpdate = onTextControlsUpdate;

    // 点击画布空白区域取消选择
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on("pointerdown", (event: FederatedPointerEvent) => {
      // 如果点击的是舞台本身（不是子元素），则取消选择
      if (event.target === this.app.stage) {
        this.currentSelectedObject = null;
        this.selectionBox.clear();
        this.controlPoints.removeChildren();
        this.onTextControlsUpdate();
      }
    });
  }

  // 选择对象（图片或文本）
  public selectObject(object: SelectableObject): void {
    this.currentSelectedObject = object;
    this.updateSelectionBox();
    this.onTextControlsUpdate();
  }

  // 获取当前选中对象
  public getCurrentSelectedObject(): SelectableObject {
    return this.currentSelectedObject;
  }

  // 更新选择框和控制点
  public updateSelectionBox(): void {
    if (!this.currentSelectedObject) return;

    console.log("更新选择框");

    const bounds = this.currentSelectedObject.getBounds();
    const padding = 10;

    // 清除旧的图形
    this.selectionBox.clear();

    // 绘制选择框
    this.selectionBox.setStrokeStyle({
      width: 2,
      color: 0x0000ff,
      alignment: 0.5,
    });

    // 绘制矩形框
    this.selectionBox.rect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
    this.selectionBox.stroke();

    // 清除旧的控制点
    this.controlPoints.removeChildren();

    // 添加控制点
    const points: ControlPoint[] = [
      { x: bounds.x - padding, y: bounds.y - padding }, // 左上
      { x: bounds.x + bounds.width + padding, y: bounds.y - padding }, // 右上
      {
        x: bounds.x + bounds.width + padding,
        y: bounds.y + bounds.height + padding,
      }, // 右下
      { x: bounds.x - padding, y: bounds.y + bounds.height + padding }, // 左下
    ];

    // 创建控制点
    points.forEach((point, index) => {
      const controlPoint = new Graphics();
      controlPoint.setStrokeStyle({
        width: 1,
        color: 0x0000ff,
      });
      controlPoint.fill({ color: 0xffffff });
      controlPoint.rect(
        -this.CONTROL_POINT_SIZE / 2,
        -this.CONTROL_POINT_SIZE / 2,
        this.CONTROL_POINT_SIZE,
        this.CONTROL_POINT_SIZE
      );
      controlPoint.stroke();
      controlPoint.x = point.x;
      controlPoint.y = point.y;
      controlPoint.eventMode = "static";
      controlPoint.cursor = "pointer";
      controlPoint.label = `control-point-${index}`;

      // 只添加 pointerdown 事件
      controlPoint.on("pointerdown", (e: FederatedPointerEvent) => {
        console.log(`控制点 ${index} 被点击`);

        // 如果已经在进行其他操作，不要开始
        if (
          this.dragManager.isImageDragging() ||
          this.rotationManager.isRotating()
        )
          return;

        this.dragManager.onDragStart(e);
      });

      this.controlPoints.addChild(controlPoint);
    });

    // 添加旋转控制点
    const rotationHandle = new Graphics();
    rotationHandle.setStrokeStyle({
      width: 1,
      color: 0x0000ff,
    });
    rotationHandle.fill({ color: 0xffffff });
    rotationHandle.circle(0, 0, this.CONTROL_POINT_SIZE / 2);
    rotationHandle.stroke();
    rotationHandle.x = bounds.x + bounds.width / 2;
    rotationHandle.y = bounds.y - padding - this.ROTATION_HANDLE_HEIGHT;
    rotationHandle.eventMode = "static";
    rotationHandle.cursor = "pointer";
    rotationHandle.label = "rotation-handle";

    // 绘制旋转手柄线
    this.selectionBox.setStrokeStyle({
      width: 1,
      color: 0x0000ff,
      alignment: 0.5,
    });
    this.selectionBox.moveTo(bounds.x + bounds.width / 2, bounds.y - padding);
    this.selectionBox.lineTo(
      bounds.x + bounds.width / 2,
      bounds.y - padding - this.ROTATION_HANDLE_HEIGHT
    );
    this.selectionBox.stroke();

    // 只添加 pointerdown 事件
    rotationHandle.on("pointerdown", (e: FederatedPointerEvent) => {
      console.log("旋转控制点被点击");

      // 如果已经在进行其他操作，不要开始
      if (this.dragManager.isImageDragging() || this.dragManager.isDragging())
        return;

      this.rotationManager.onRotateStart(e);
    });

    this.controlPoints.addChild(rotationHandle);
  }
}
