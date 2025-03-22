import { Application, Container, Graphics } from "pixi.js";
import { SelectionManager } from "./managers/SelectionManager";
import { DragManager } from "./managers/DragManager";
import { RotationManager } from "./managers/RotationManager";
import { TextManager } from "./managers/TextManager";
import { ImageManager } from "./managers/ImageManager";
import { VideoManager } from "./managers/VideoManager";

export class App {
  private app!: Application;
  private imageContainer!: Container;
  private selectionBox!: Graphics;
  private controlPoints!: Container;
  private selectionManager!: SelectionManager;
  private dragManager!: DragManager;
  private rotationManager!: RotationManager;
  private textManager!: TextManager;
  private imageManager!: ImageManager;
  private videoManager!: VideoManager;
  private dpr: number;

  constructor() {
    // 获取设备像素比
    this.dpr = window.devicePixelRatio || 1;
  }

  public async init(): Promise<void> {
    console.log("初始化 PixiJS 应用...");

    // 创建 PixiJS 应用
    this.app = new Application();

    // 初始化应用
    await this.app.init({
      width: 800,
      height: 600,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: this.dpr, // 设置分辨率为设备像素比
      autoDensity: true, // 自动调整密度
      // 确保启用全局移动事件
      eventFeatures: {
        move: true,
        globalMove: true,
        click: true,
        wheel: true,
      },
    });

    console.log("PixiJS 应用初始化完成");

    // 将应用添加到页面
    const appContainer = document.getElementById("app")!;
    appContainer.appendChild(this.app.canvas);

    console.log("PixiJS 画布已添加到页面");

    // 创建一个容器来存放图片和控制点
    this.imageContainer = new Container();
    this.app.stage.addChild(this.imageContainer);

    // 创建选择框
    this.selectionBox = new Graphics();
    this.imageContainer.addChild(this.selectionBox);

    // 创建控制点容器
    this.controlPoints = new Container();
    this.imageContainer.addChild(this.controlPoints);

    // 初始化所有管理器
    this.initManagers();
  }

  private initManagers(): void {
    // 创建各个管理器，按照依赖关系的顺序初始化

    // 1. 首先创建 DragManager（它被其他 manager 依赖）
    this.dragManager = new DragManager(
      this.app,
      () => this.selectionManager?.getCurrentSelectedObject() || null,
      () => this.selectionManager?.updateSelectionBox()
    );

    // 2. 创建 RotationManager
    this.rotationManager = new RotationManager(
      this.app,
      () => this.selectionManager?.getCurrentSelectedObject() || null,
      () => this.selectionManager?.updateSelectionBox()
    );

    // 3. 创建 SelectionManager
    this.selectionManager = new SelectionManager(
      this.app,
      this.imageContainer,
      this.selectionBox,
      this.controlPoints,
      this.dragManager,
      this.rotationManager,
      () => this.textManager?.updateTextControls()
    );

    // 4. 创建 TextManager
    this.textManager = new TextManager(
      this.app,
      this.imageContainer,
      () => this.selectionManager.getCurrentSelectedObject(),
      (object) => this.selectionManager.selectObject(object),
      () => this.selectionManager.updateSelectionBox(),
      this.dragManager,
      this.dpr
    );

    // 5. 创建 ImageManager
    this.imageManager = new ImageManager(
      this.app,
      this.imageContainer,
      this.dragManager,
      (object) => this.selectionManager.selectObject(object),
      () => this.selectionManager.updateSelectionBox()
    );
    
    // 6. 创建 VideoManager
    this.videoManager = new VideoManager(
      this.app,
      this.imageContainer,
      this.dragManager,
      (object) => this.selectionManager.selectObject(object),
      () => this.selectionManager.updateSelectionBox(),
      this.dpr
    );
  }
}
