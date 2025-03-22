// 扩展Text类型以包含lastClickTime属性
declare module "pixi.js" {
  interface Text {
    lastClickTime?: number;
  }
}

import { App } from "./App";

// 启动应用
(async () => {
  const app = new App();
  await app.init();
})();
