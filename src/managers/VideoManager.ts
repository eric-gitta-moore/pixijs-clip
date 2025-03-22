import { Application, Sprite, Container, Graphics, Texture } from "pixi.js";
import { DragManager } from "./DragManager";
import { SelectableObject, VideoContainer, TimelineData } from "../utils/types";

export class VideoManager {
  private app: Application;
  private currentVideo: VideoContainer | null = null;
  private videoContainer: Container;
  private dragManager: DragManager;
  private selectObject: (object: SelectableObject) => void;
  private updateSelectionBox: () => void;
  private timeline: Graphics | null = null;
  private timelineContainer: Container;
  private timelineDragger: Graphics | null = null;
  private isDraggingTimeline: boolean = false;
  private dpr: number;
  private videoElement: HTMLVideoElement | null = null;

  constructor(
    app: Application,
    videoContainer: Container,
    dragManager: DragManager,
    selectObject: (object: SelectableObject) => void,
    updateSelectionBox: () => void,
    dpr: number
  ) {
    this.app = app;
    this.videoContainer = videoContainer;
    this.dragManager = dragManager;
    this.selectObject = selectObject;
    this.updateSelectionBox = updateSelectionBox;
    this.dpr = dpr;

    // 创建时间轴容器
    this.timelineContainer = new Container();
    this.timelineContainer.y = this.app.screen.height - 50;
    this.app.stage.addChild(this.timelineContainer);

    // 初始化视频上传处理
    this.initVideoUploadHandler();

    // 初始化播放按钮
    this.initPlayButton();
  }

  private initVideoUploadHandler(): void {
    // 处理视频上传
    const videoInput = document.getElementById(
      "videoInput"
    ) as HTMLInputElement;
    if (!videoInput) {
      console.error(
        "未找到视频上传输入元素，请确保添加了 id 为 videoInput 的 input 元素"
      );
      return;
    }

    videoInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      console.log("处理视频上传：", file.name);

      try {
        // 创建视频 URL
        const url = URL.createObjectURL(file);

        // 如果已经有视频，先移除
        this.cleanupCurrentVideo();

        // 创建一个 HTML 视频元素
        this.videoElement = document.createElement("video");

        // 设置视频属性
        this.videoElement.src = url;
        this.videoElement.crossOrigin = "anonymous";
        this.videoElement.muted = false; // 确保声音可以播放
        this.videoElement.controls = false;
        this.videoElement.playsInline = true;
        this.videoElement.autoplay = false;
        this.videoElement.loop = true;
        this.videoElement.width = 640;
        this.videoElement.height = 360;

        // 将视频元素添加到页面上，但保持隐藏状态
        document.body.appendChild(this.videoElement);

        console.log("视频元素创建完成，等待加载元数据...");

        // 等待视频加载元数据
        await new Promise<void>((resolve) => {
          const onMetadataLoaded = () => {
            console.log("视频元数据已加载", {
              duration: this.videoElement?.duration,
              width: this.videoElement?.videoWidth,
              height: this.videoElement?.videoHeight,
            });
            this.videoElement?.removeEventListener(
              "loadedmetadata",
              onMetadataLoaded
            );
            resolve();
          };

          this.videoElement?.addEventListener(
            "loadedmetadata",
            onMetadataLoaded
          );

          // 设置超时
          setTimeout(() => {
            console.warn("视频元数据加载超时");
            this.videoElement?.removeEventListener(
              "loadedmetadata",
              onMetadataLoaded
            );
            resolve();
          }, 5000);
        });

        console.log("等待视频可以播放...");

        // 等待视频可以播放
        await new Promise<void>((resolve) => {
          if (!this.videoElement) {
            resolve();
            return;
          }

          const onCanPlay = () => {
            console.log("视频可以开始播放了");
            this.videoElement?.removeEventListener("canplay", onCanPlay);
            resolve();
          };

          this.videoElement.addEventListener("canplay", onCanPlay);

          // 如果已经可以播放了
          if (this.videoElement.readyState >= 3) {
            console.log("视频已经可以播放，直接继续");
            resolve();
          }

          // 设置超时
          setTimeout(() => {
            console.warn("等待视频可播放状态超时");
            this.videoElement?.removeEventListener("canplay", onCanPlay);
            resolve();
          }, 5000);
        });

        if (!this.videoElement) {
          throw new Error("视频元素创建失败");
        }

        // 尝试播放一帧视频以确保纹理已经初始化
        try {
          await this.videoElement.play();
          // 播放一小段时间后暂停，以确保纹理初始化
          await new Promise<void>((resolve) =>
            setTimeout(() => {
              this.videoElement?.pause();
              resolve();
            }, 200)
          );
          console.log("视频已短暂播放并暂停，纹理应该已初始化");
        } catch (playError) {
          console.warn("视频初始播放失败，可能需要用户交互", playError);
        }

        // 创建视频精灵
        console.log("创建视频精灵...");
        // 从视频元素创建纹理
        const videoTexture = Texture.from(this.videoElement);
        const videoSprite = new Sprite(videoTexture) as VideoContainer;

        // 设置视频容器属性
        videoSprite.videoElement = this.videoElement;
        videoSprite.timeline = {
          duration: this.videoElement.duration || 0,
          currentTime: 0,
        };

        // 设置视频位置和大小
        videoSprite.anchor.set(0.5);
        videoSprite.x = this.app.screen.width / 2;
        videoSprite.y = this.app.screen.height / 2;

        // 调整大小
        const scale = Math.min(
          (this.app.screen.width * 0.8) /
            Math.max(this.videoElement.videoWidth, 320),
          (this.app.screen.height * 0.8) /
            Math.max(this.videoElement.videoHeight, 240)
        );
        videoSprite.scale.set(scale);

        // 设置交互模式
        videoSprite.eventMode = "static";

        // 添加到容器
        this.videoContainer.addChildAt(videoSprite, 0);
        this.currentVideo = videoSprite;

        // 显示播放按钮
        const playButton = document.getElementById("playVideoBtn");
        if (playButton) {
          playButton.style.display = "inline-block";
        }

        // 创建时间轴控制器
        this.createVideoControls();

        // 设置为当前选中对象
        this.selectObject(this.currentVideo);

        // 设置交互
        this.setupVideoInteraction();

        // 更新选择框
        this.updateSelectionBox();

        // 添加到 ticker 更新纹理
        this.app.ticker.add(this.updateVideoTexture, this);

        // 尝试播放视频
        try {
          await this.videoElement.play();
          console.log("视频开始播放");
        } catch (playError) {
          console.warn("自动播放失败，需要用户交互", playError);

          // 提示用户点击播放
          console.log('请点击"播放视频"按钮或视频区域来开始播放');
        }
      } catch (error) {
        console.error("加载视频失败：", error);
        this.cleanupCurrentVideo();
      }
    };
  }

  // 清理当前视频资源
  private cleanupCurrentVideo(): void {
    // 移除 ticker 更新
    this.app.ticker.remove(this.updateVideoTexture, this);

    // 移除当前视频对象
    if (this.currentVideo) {
      this.videoContainer.removeChild(this.currentVideo);

      // 停止并移除视频元素
      if (this.currentVideo.videoElement) {
        this.currentVideo.videoElement.pause();
        this.currentVideo.videoElement.remove();
      }

      this.currentVideo = null;
    }

    // 单独清理视频元素
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = "";
      this.videoElement.load(); // 清空缓冲区
      this.videoElement.remove();
      this.videoElement = null;
    }

    // 隐藏播放按钮
    const playButton = document.getElementById("playVideoBtn");
    if (playButton) {
      playButton.style.display = "none";
    }
  }

  private initPlayButton(): void {
    const playButton = document.getElementById("playVideoBtn");
    if (!playButton) {
      console.error("未找到播放按钮元素");
      return;
    }

    playButton.addEventListener("click", () => {
      if (this.currentVideo && this.currentVideo.videoElement) {
        console.log("手动触发视频播放");

        // 如果视频暂停中，则播放；否则暂停
        if (this.currentVideo.videoElement.paused) {
          this.currentVideo.videoElement
            .play()
            .then(() => console.log("视频播放成功"))
            .catch((err) => console.error("视频播放失败：", err));
        } else {
          this.currentVideo.videoElement.pause();
          console.log("视频已暂停");
        }
      } else {
        console.warn("没有可播放的视频");
      }
    });
  }

  private updateVideoTexture = (): void => {
    if (this.currentVideo && this.currentVideo.videoElement) {
      // 更新时间轴位置
      this.updateTimelineDragger();

      // 在 PixiJS v7 中，视频纹理通常会自动更新
      // 但我们可以强制更新
      try {
        this.currentVideo.texture.baseTexture.update();
      } catch (e) {
        // 忽略错误
      }
    }
  };

  // 创建视频控制器和时间轴
  private createVideoControls(): void {
    if (!this.currentVideo) return;

    // 添加视频调试信息到控制台
    const videoElement = this.currentVideo.videoElement;
    const videoInfo = {
      duration: videoElement.duration,
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
      readyState: videoElement.readyState,
      paused: videoElement.paused,
    };
    console.log("视频信息：", videoInfo);

    // 清除现有的时间轴
    if (this.timeline) {
      this.timelineContainer.removeChild(this.timeline);
      this.timeline = null;
    }

    if (this.timelineDragger) {
      this.timelineContainer.removeChild(this.timelineDragger);
      this.timelineDragger = null;
    }

    // 创建时间轴背景
    const timeline = new Graphics();
    timeline.beginFill(0xcccccc);
    timeline.drawRect(0, 0, this.app.screen.width - 100, 10);
    timeline.endFill();
    timeline.x = 50;
    timeline.y = 0;
    timeline.eventMode = "static";
    this.timeline = timeline;

    // 创建时间轴拖动器
    const dragger = new Graphics();
    dragger.beginFill(0xff0000);
    dragger.drawCircle(0, 5, 8);
    dragger.endFill();
    dragger.x = 50; // 初始位置与时间轴起点一致
    dragger.y = 0;
    dragger.eventMode = "static";
    this.timelineDragger = dragger;

    // 添加到容器
    this.timelineContainer.addChild(timeline);
    this.timelineContainer.addChild(dragger);

    // 设置时间轴交互
    this.setupTimelineInteraction();
  }

  // 设置时间轴交互
  private setupTimelineInteraction(): void {
    if (!this.timeline || !this.timelineDragger || !this.currentVideo) return;

    // 点击时间轴跳转到对应位置
    this.timeline.addEventListener("pointerdown", (event) => {
      if (!this.currentVideo) return;

      // 计算点击位置对应的时间
      const timelineWidth = this.app.screen.width - 100;
      const clickPosition = event.global.x - 50;
      const percentage = Math.max(
        0,
        Math.min(1, clickPosition / timelineWidth)
      );

      // 设置视频时间
      this.currentVideo.videoElement.currentTime =
        percentage * this.currentVideo.timeline.duration;
      this.currentVideo.timeline.currentTime =
        this.currentVideo.videoElement.currentTime;

      // 更新拖动器位置
      this.updateTimelineDragger();
    });

    // 拖动时间轴指示器
    this.timelineDragger.addEventListener("pointerdown", (event) => {
      this.isDraggingTimeline = true;

      // 添加全局移动事件
      this.app.stage.addEventListener(
        "globalpointermove",
        this.handleTimelineDrag
      );
      this.app.stage.addEventListener("pointerup", this.stopTimelineDrag);
      this.app.stage.addEventListener(
        "pointerupoutside",
        this.stopTimelineDrag
      );
    });

    // 视频控制：播放/暂停
    this.currentVideo.addEventListener("pointerdown", (event) => {
      if (!this.currentVideo) return;

      // 双击视频播放/暂停
      const now = Date.now();
      if (now - (this.currentVideo.lastClickTime || 0) < 300) {
        if (this.currentVideo.videoElement.paused) {
          this.currentVideo.videoElement.play();
        } else {
          this.currentVideo.videoElement.pause();
        }
      }
      this.currentVideo.lastClickTime = now;
    });
  }

  // 处理时间轴拖动
  private handleTimelineDrag = (event: any): void => {
    if (
      !this.isDraggingTimeline ||
      !this.currentVideo ||
      !this.timelineDragger ||
      !this.timeline
    )
      return;

    // 计算拖动位置对应的时间
    const timelineWidth = this.app.screen.width - 100;
    const dragPosition = Math.max(
      50,
      Math.min(this.app.screen.width - 50, event.global.x)
    );
    const percentage = (dragPosition - 50) / timelineWidth;

    // 更新拖动器位置
    this.timelineDragger.x = dragPosition;

    // 更新视频时间
    this.currentVideo.videoElement.currentTime =
      percentage * this.currentVideo.timeline.duration;
    this.currentVideo.timeline.currentTime =
      this.currentVideo.videoElement.currentTime;
  };

  // 停止时间轴拖动
  private stopTimelineDrag = (): void => {
    this.isDraggingTimeline = false;

    // 移除全局事件监听
    this.app.stage.removeEventListener(
      "globalpointermove",
      this.handleTimelineDrag
    );
    this.app.stage.removeEventListener("pointerup", this.stopTimelineDrag);
    this.app.stage.removeEventListener(
      "pointerupoutside",
      this.stopTimelineDrag
    );
  };

  // 更新时间轴拖动器位置
  private updateTimelineDragger(): void {
    if (
      !this.timelineDragger ||
      !this.currentVideo ||
      !this.timeline ||
      this.isDraggingTimeline
    )
      return;

    const timelineWidth = this.app.screen.width - 100;
    const percentage =
      this.currentVideo.videoElement.currentTime /
      this.currentVideo.timeline.duration;

    // 更新拖动器位置
    this.timelineDragger.x = 50 + timelineWidth * percentage;

    // 更新时间数据
    this.currentVideo.timeline.currentTime =
      this.currentVideo.videoElement.currentTime;
  }

  // 设置视频交互
  private setupVideoInteraction(): void {
    if (!this.currentVideo) return;

    // 设置拖动功能
    this.dragManager.setupObjectDrag(this.currentVideo);
  }

  // 获取当前视频
  public getCurrentVideo(): VideoContainer | null {
    return this.currentVideo;
  }
}
