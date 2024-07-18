# sanyue_imghub

## Introduction

[cf-pages/Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)项目的一个新前端，实现了**上传图片预览**，**多文件上传**，**拖拽上传**等功能。

![](https://alist.sanyue.site/d/imgbed/202407182037148.png)

![](https://alist.sanyue.site/d/imgbed/202407182037249.png)

## Features

- 前端开源（可自行修改、打包使用）
- 上传文件实现呼吸灯效果
- 上传显示实时上传进度
- 支持整体复制和单独复制（整体复制即将所有链接通过换行串联起来后复制）

## Deployment

如果要在原项目基础上部署新前端，只需要三步：

1. 将该项目拉到本地，`npm install`，修改环境变量`.env`中的`VUE_APP_SITE_URL`为你自己图床的URL
2. `npm run build`，进入打包好的`/dist`目录，将里面的所有内容复制到`telegraph-image`项目的根目录（如果你还想保留原来的前端，请将原来的`index.html`重命名为`index-bk.html`）
3. 将修改好的`telegraph-image`项目部署上去即可，具体方法参照原项目

**一天手搓出来的前端，后续还会继续完善，有bug欢迎提出。**

**如果觉得项目不错希望您能给个免费的star✨✨✨，非常感谢！**
