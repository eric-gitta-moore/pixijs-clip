import { Application, Sprite, Container } from 'pixi.js';
import { DragManager } from './DragManager';
import { SelectableObject } from '../utils/types';

export class ImageManager {
  private app: Application;
  private currentSprite: Sprite | null = null;
  private imageContainer: Container;
  private dragManager: DragManager;
  private selectObject: (object: SelectableObject) => void;
  private updateSelectionBox: () => void;

  constructor(
    app: Application, 
    imageContainer: Container,
    dragManager: DragManager,
    selectObject: (object: SelectableObject) => void,
    updateSelectionBox: () => void
  ) {
    this.app = app;
    this.imageContainer = imageContainer;
    this.dragManager = dragManager;
    this.selectObject = selectObject;
    this.updateSelectionBox = updateSelectionBox;

    // 初始化图片上传处理
    this.initImageUploadHandler();
  }

  private initImageUploadHandler(): void {
    // 处理图片上传
    const imageInput = document.getElementById('imageInput') as HTMLInputElement;
    imageInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      console.log('处理图片上传:', file.name);
      
      try {
        // 创建图片 URL
        const url = URL.createObjectURL(file);
        
        // 如果已经有图片，先移除
        if (this.currentSprite) {
          this.imageContainer.removeChild(this.currentSprite);
          URL.revokeObjectURL(url);
        }

        // 等待图片加载并转换为 Canvas
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = url;
        });

        // 创建 Canvas 并绘制图片
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);

        // 清理 URL
        URL.revokeObjectURL(url);

        // 创建新的精灵
        this.currentSprite = Sprite.from(canvas);
        
        // 设置图片初始位置和锚点
        this.currentSprite.anchor.set(0.5);
        this.currentSprite.x = this.app.screen.width / 2;
        this.currentSprite.y = this.app.screen.height / 2;
        
        // 根据画布大小调整图片大小
        const scale = Math.min(
          (this.app.screen.width * 0.8) / this.currentSprite.width,
          (this.app.screen.height * 0.8) / this.currentSprite.height
        );
        this.currentSprite.scale.set(scale);

        // 确保图片可交互
        this.currentSprite.eventMode = 'static';
        
        // 添加到容器
        this.imageContainer.addChildAt(this.currentSprite, 0);
        
        // 设置当前选中对象为图片
        this.selectObject(this.currentSprite);
        
        // 设置交互
        this.setupImageInteraction();
        
        // 更新选择框
        this.updateSelectionBox();
        
        console.log('图片加载完成，已设置交互');
      } catch (error) {
        console.error('加载图片失败:', error);
      }
    };
  }

  // 设置图片交互
  private setupImageInteraction(): void {
    if (!this.currentSprite) return;
    
    // 设置拖动功能
    this.dragManager.setupObjectDrag(this.currentSprite);
  }

  // 获取当前精灵
  public getCurrentSprite(): Sprite | null {
    return this.currentSprite;
  }
} 