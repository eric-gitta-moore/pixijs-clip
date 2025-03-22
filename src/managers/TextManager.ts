import { Application, Text, TextStyle, FederatedPointerEvent, Sprite, Container } from 'pixi.js';
import { SelectableObject } from '../utils/types';

export class TextManager {
  private app: Application;
  private textObjects: Text[] = [];
  private isEditingText = false;
  private currentTextInput: HTMLInputElement | null = null;
  private lastClickTimeMap = new Map<Text, number>();
  private getSelectedObject: () => SelectableObject;
  private selectObject: (object: Sprite | Text) => void;
  private updateSelectionBox: () => void;
  private dragManager: any;
  private dpr: number;
  private imageContainer: Container;

  constructor(
    app: Application,
    imageContainer: Container,
    getSelectedObject: () => SelectableObject,
    selectObject: (object: Sprite | Text) => void,
    updateSelectionBox: () => void,
    dragManager: any,
    dpr: number
  ) {
    this.app = app;
    this.imageContainer = imageContainer;
    this.getSelectedObject = getSelectedObject;
    this.selectObject = selectObject;
    this.updateSelectionBox = updateSelectionBox;
    this.dragManager = dragManager;
    this.dpr = dpr;

    // 初始化文本控件事件
    this.initTextControls();
  }

  private initTextControls(): void {
    // 获取文本控件
    const textControls = document.getElementById('textControls')!;
    const textColorInput = document.getElementById('textColor') as HTMLInputElement;
    const fontSizeInput = document.getElementById('fontSize') as HTMLInputElement;
    const fontSizeValue = document.getElementById('fontSizeValue') as HTMLSpanElement;
    
    // 当颜色选择器值改变时更新文本颜色
    textColorInput.addEventListener('input', () => {
      const currentSelectedObject = this.getSelectedObject();
      if (currentSelectedObject instanceof Text) {
        // 将HTML颜色('#rrggbb')转换为PIXI颜色(0xrrggbb)
        const color = parseInt(textColorInput.value.substring(1), 16);
        currentSelectedObject.style.fill = color;
      }
    });
    
    // 当字体大小滑块值改变时更新文本大小
    fontSizeInput.addEventListener('input', () => {
      // 更新显示的字体大小值
      fontSizeValue.textContent = fontSizeInput.value;
      
      const currentSelectedObject = this.getSelectedObject();
      if (currentSelectedObject instanceof Text) {
        // 更新文本字体大小
        currentSelectedObject.style.fontSize = Number(fontSizeInput.value);
        
        // 更新选择框
        this.updateSelectionBox();
      }
    });
    
    // 添加字体大小快速选择按钮事件
    const fontSizeButtons = document.querySelectorAll('.font-size-btn');
    fontSizeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const fontSize = Number(target.dataset.size);
        
        // 更新滑块和显示值
        fontSizeInput.value = fontSize.toString();
        fontSizeValue.textContent = fontSize.toString();
        
        const currentSelectedObject = this.getSelectedObject();
        if (currentSelectedObject instanceof Text) {
          // 更新文本字体大小
          currentSelectedObject.style.fontSize = fontSize;
          
          // 更新选择框
          this.updateSelectionBox();
        }
      });
    });

    // 添加文本按钮功能
    const addTextBtn = document.getElementById('addTextBtn') as HTMLButtonElement;
    addTextBtn.addEventListener('click', () => {
      console.log('添加文本按钮被点击');
      
      // 获取当前选择的颜色和字体大小
      const textColor = parseInt(textColorInput.value.substring(1), 16);
      const fontSize = Number(fontSizeInput.value);
      
      this.addNewText(textColor, fontSize);
    });
  }

  // 更新文本控件状态
  public updateTextControls(): void {
    const textControls = document.getElementById('textControls')!;
    const textColorInput = document.getElementById('textColor') as HTMLInputElement;
    const fontSizeInput = document.getElementById('fontSize') as HTMLInputElement;
    const fontSizeValue = document.getElementById('fontSizeValue') as HTMLSpanElement;
    
    const currentSelectedObject = this.getSelectedObject();
    if (currentSelectedObject instanceof Text) {
      textControls.classList.add('active');
      
      // 更新颜色选择器为当前文本颜色
      const fillColor = currentSelectedObject.style.fill;
      if (typeof fillColor === 'number') {
        // 将PIXI颜色(0xrrggbb)转换为HTML颜色('#rrggbb')
        const hexColor = '#' + fillColor.toString(16).padStart(6, '0');
        textColorInput.value = hexColor;
      }
      
      // 更新字体大小滑块为当前文本大小
      const fontSize = currentSelectedObject.style.fontSize;
      if (fontSize !== undefined) {
        fontSizeInput.value = fontSize.toString();
        fontSizeValue.textContent = fontSize.toString();
      }
    } else {
      textControls.classList.remove('active');
    }
  }

  // 添加新文本
  public addNewText(textColor: number, fontSize: number): void {
    // 创建默认文本样式
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: fontSize,
      fill: textColor,
      align: 'center',
      fontWeight: 'normal',
      letterSpacing: 0,
    });
    
    // 创建文本对象 - 使用新的API格式
    const text = new Text({
      text: '点击编辑文本',
      style
    });
    text.anchor.set(0.5);
    
    // 设置文本清晰度因素
    text.resolution = this.dpr;
    
    const currentSelectedObject = this.getSelectedObject();
    // 初始位置在画布中间，或者在图片上方如果有图片的话
    if (currentSelectedObject instanceof Sprite) {
      text.x = currentSelectedObject.x;
      text.y = currentSelectedObject.y - 100;
    } else {
      text.x = this.app.screen.width / 2;
      text.y = this.app.screen.height / 2;
    }
    
    // 设置文本为可交互
    text.eventMode = 'static';
    text.cursor = 'pointer';
    
    // 添加到容器中
    this.imageContainer.addChild(text);
    this.textObjects.push(text);
    
    // 设置文本交互
    this.setupTextInteraction(text);
    
    // 选中这个文本
    this.selectObject(text);
    
    // 立即开始编辑模式
    this.startTextEditing(text);
  }

  // 设置文本交互
  private setupTextInteraction(text: Text): void {
    // 单击文本时选中它
    text.on('pointerdown', (event: FederatedPointerEvent) => {
      console.log('文本被点击');
      
      // 如果其他操作正在进行中，不要开始操作
      if (this.dragManager.isDragging() || this.dragManager.isImageDragging()) return;
      
      // 选中文本
      this.selectObject(text);
      
      // 如果是双击，则进入编辑模式
      if (event.pointerType === 'mouse' && event.button === 0) {
        const now = Date.now();
        if (now - (this.lastClickTimeMap.get(text) || 0) < 300) { // 双击检测
          this.startTextEditing(text);
        }
        this.lastClickTimeMap.set(text, now);
      }
      
      // 标记为拖动状态（单击时）
      if (!this.isEditingText) {
        this.dragManager.setupObjectDrag(text);
      }
      
      // 防止事件冒泡
      event.stopPropagation();
    });
  }

  // 开始文本编辑
  public startTextEditing(text: Text): void {
    console.log('开始编辑文本');
    
    // 如果已经在编辑中，先结束之前的编辑
    if (this.isEditingText && this.currentTextInput) {
      try {
        if (this.currentTextInput.parentNode) {
          this.currentTextInput.parentNode.removeChild(this.currentTextInput);
        }
      } catch (error) {
        console.warn('移除已有文本输入框时出错:', error);
      }
      this.currentTextInput = null;
    }
    
    this.isEditingText = true;
    
    // 获取文本颜色，并设置输入框颜色
    let textColor = '#000000';
    const fillColor = text.style.fill;
    if (typeof fillColor === 'number') {
      textColor = '#' + fillColor.toString(16).padStart(6, '0');
    }
    
    // 将当前文本的字体大小同步到控件
    const fontSize = text.style.fontSize;
    if (fontSize !== undefined) {
      const fontSizeInput = document.getElementById('fontSize') as HTMLInputElement;
      const fontSizeValue = document.getElementById('fontSizeValue') as HTMLSpanElement;
      fontSizeInput.value = fontSize.toString();
      fontSizeValue.textContent = fontSize.toString();
    }
    
    // 创建一个输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = text.text;
    
    // 设置样式
    const textMetrics = text.getBounds();
    
    // 获取画布位置和尺寸以便正确定位输入框
    const canvasRect = this.app.canvas.getBoundingClientRect();
    
    input.style.position = 'absolute';
    input.style.left = `${canvasRect.left + textMetrics.x}px`;
    input.style.top = `${canvasRect.top + textMetrics.y}px`;
    input.style.width = `${textMetrics.width + 20}px`;
    input.style.height = `${textMetrics.height}px`;
    input.style.fontSize = `${text.style.fontSize}px`;
    input.style.fontFamily = typeof text.style.fontFamily === 'string' 
      ? text.style.fontFamily 
      : Array.isArray(text.style.fontFamily) ? text.style.fontFamily[0] : 'Arial';
    input.style.textAlign = 'center';
    input.style.color = textColor;
    input.style.border = '1px solid blue';
    input.style.background = 'rgba(255, 255, 255, 0.8)';
    input.style.padding = '0';
    input.style.margin = '0';
    input.style.transform = `rotate(${text.rotation}rad)`;
    input.style.transformOrigin = 'center';
    input.style.borderRadius = '0';
    input.style.boxSizing = 'border-box';
    input.style.webkitAppearance = 'none';
    
    // 添加到页面
    document.body.appendChild(input);
    this.currentTextInput = input;
    
    // 聚焦并选中全部文本
    input.focus();
    input.select();
    
    // 用于跟踪是否已处理
    let isFinishHandled = false;
    
    // 处理完成编辑
    const finishEditing = () => {
      if (!this.isEditingText || !this.currentTextInput || isFinishHandled) return;
      
      // 标记为已处理，防止重复调用
      isFinishHandled = true;
      
      // 更新文本内容
      if (text && this.currentTextInput.value.trim() !== '') {
        text.text = this.currentTextInput.value;
      }
      
      // 确保输入框仍然存在于DOM中再尝试移除
      try {
        if (this.currentTextInput.parentNode) {
          this.currentTextInput.parentNode.removeChild(this.currentTextInput);
        }
      } catch (error) {
        console.warn('移除文本输入框时出错:', error);
      }
      
      this.currentTextInput = null;
      this.isEditingText = false;
      
      // 更新选择框
      this.updateSelectionBox();
    };
    
    // 绑定事件
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // 防止默认的表单提交行为
        finishEditing();
      }
    });
  }

  // 获取文本对象列表
  public getTextObjects(): Text[] {
    return this.textObjects;
  }

  // 检查是否正在编辑文本
  public isEditing(): boolean {
    return this.isEditingText;
  }
} 