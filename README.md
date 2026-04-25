<div align="center">
    <a href="https://github.com/MarSeventh/CloudFlare-ImgBed"><img width="80%" alt="logo" src="https://github.com/MarSeventh/CloudFlare-ImgBed/raw/main/readme/banner.png"/></a>
    <p><em>🗂️开源文件托管解决方案，支持 Docker 和无服务器部署，支持 Telegram、Discord、Cloudflare R2、S3、Huggingface 等多种存储渠道，支持 WebDAV 协议和多种 RESTful API</em></p>
    <p>
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/blob/main/README.md">简体中文</a> | <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/blob/main/README_en.md">English</a> | <a href="https://cfbed.sanyue.de">官方网站</a>
    </p>
    <p align="center">
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/blob/main/LICENSE">
        <img src="https://img.shields.io/github/license/MarSeventh/CloudFlare-ImgBed" alt="License" />
        </a>
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/releases">
        <img src="https://img.shields.io/github/release/MarSeventh/CloudFlare-ImgBed" alt="latest version" />
        </a>
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/releases">
        <img src="https://img.shields.io/github/downloads/MarSeventh/CloudFlare-ImgBed/total?color=%239F7AEA&logo=github" alt="Downloads" />
        </a>
        <a href="https://hub.docker.com/r/marseventh/cloudflare-imgbed">
  		  <img src="https://img.shields.io/docker/pulls/marseventh/cloudflare-imgbed?style=flat-square" alt="Docker Pulls" />
		</a>
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/issues">
          <img src="https://img.shields.io/github/issues/MarSeventh/CloudFlare-ImgBed" alt="Issues" />
        </a>
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/stargazers">
          <img src="https://img.shields.io/github/stars/MarSeventh/CloudFlare-ImgBed" alt="Stars" />
        </a>
        <a href="https://github.com/MarSeventh/CloudFlare-ImgBed/network/members">
          <img src="https://img.shields.io/github/forks/MarSeventh/CloudFlare-ImgBed" alt="Forks" />
        </a>
    </P>
    <p align="center">
      <a href="https://trendshift.io/repositories/14324" target="_blank">
        <img src="https://trendshift.io/api/badge/repositories/14324" alt="GitHub Trending" height="80">
      </a>
    </p>
</div>



----
# sanyue_imghub

### 本仓库为[MarSeventh/CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)项目的前端仓库，详细介绍及部署方式请移步该仓库。

## Deployment

如果要在**完整项目基础上定制前端**，只需要四步（**前提是你需要有基本的`git`、`nodejs`等工具的使用能力**）：

1. 将`CloudFlare-ImgBed`拉取到本地，`npm install`安装依赖，`npm run start`启动项目（作为后端服务运行）
2. 将该前端项目拉取到本地，`npm install`，修改环境变量`.env.development`中的`VUE_APP_BACKEND_URL`为你本地后端服务的URL（默认无需修改）
3. 进行DIY，然后`npm run build`，进入打包好的`/dist`目录，将里面的所有内容复制到`CloudFlare-ImgBed`项目的根目录
4. 将修改好的`CloudFlare-ImgBed`项目部署上去即可，具体方法参照完整项目的文档

## TIPS

**如果觉得项目不错希望您能给个免费的star✨✨✨，非常感谢！**
