# sanyue_imghub

### 本仓库为[MarSeventh/CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)项目的前端仓库，详细介绍及部署方式请移步该仓库。

## Deployment

如果要在**完整项目基础上定制前端**，只需要三步（**前提是你需要有基本的`git`、`nodejs`等工具的使用能力**）：

1. 将该项目拉到本地，`npm install`，修改环境变量`.env`中的`VUE_APP_SITE_URL`为你自己图床的URL
2. 进行DIY，然后`npm run build`，进入打包好的`/dist`目录，将里面的所有内容复制到`CloudFlare-ImgBed`项目的根目录
3. 将修改好的`CloudFlare-ImgBed`项目部署上去即可，具体方法参照完整项目的文档

## TIPS

**一天手搓出来的前端，后续还会继续完善，有bug欢迎提出。**

**如果觉得项目不错希望您能给个免费的star✨✨✨，非常感谢！**
