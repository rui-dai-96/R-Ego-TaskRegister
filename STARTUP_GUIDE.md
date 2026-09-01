# Task Register 启动与配置指南

这是一套前端 + Supabase 后端的本地开发项目。前端使用 React / TypeScript / Vite，后端依赖 Supabase 本地 Docker 服务，包括 PostgreSQL、Auth、Storage、Edge Functions。

## 1. 项目结构速览

关键文件：

```text
package.json                         # npm scripts 和依赖
.env.example                         # 本地环境变量模板
src/main.tsx                         # 前端入口
src/App.tsx                          # 路由入口
src/lib/supabase.ts                  # Supabase client 初始化
supabase/config.toml                 # Supabase 本地服务配置
supabase/migrations/*.sql            # 数据库迁移
supabase/seed.sql                    # 本地种子数据和测试账号
supabase/functions/create-vendor     # Edge Function
supabase/functions/manage-vendor     # Edge Function
```

本地默认端口：

```text
前端 Vite: http://localhost:5173
Supabase API: http://127.0.0.1:54321
Supabase DB: 127.0.0.1:54322
Supabase Studio: http://127.0.0.1:54323
Inbucket 邮件服务: http://127.0.0.1:54324
```

## 2. 环境要求

需要安装：

```text
Node.js 22+
npm
Docker Desktop
Supabase CLI
```

检查命令：

```bash
node -v
npm -v
docker --version
npx supabase --version
```

如果 `npx supabase --version` 可以运行，说明项目依赖里的 Supabase CLI 可用。

## 3. 第一次启动

进入项目目录：

```bash
cd /Users/dairui/Desktop/task_register
```

安装依赖：

```bash
npm install
```

创建本地环境变量文件：

```bash
cp .env.example .env.local
```

启动 Supabase 本地服务：

```bash
npm run db:start
```

初始化数据库，执行 migrations 和 seed：

```bash
npm run db:reset
```

查看本地 Supabase 配置：

```bash
npx supabase status
```

把输出里的 `API URL` 和 anon key 填到 `.env.local`。
新版 Supabase CLI 可能不再显示 `anon key` 字样，而是显示 `Publishable`；此时把 `Publishable` 的值填给 `VITE_SUPABASE_ANON_KEY`，不要填 `Secret`。

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<粘贴 npx supabase status 输出的 Publishable/anon key>
VITE_DEMO_MODE=false
```

启动前端：

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

## 4. 本地测试账号

`supabase/seed.sql` 里已经提供本地账号。

管理员账号：

```text
admin@ropedia.local
AdminDemo!2026
```

供应商账号：

```text
stardust@ropedia.local
VendorDemo!2026

matrix@ropedia.local
VendorDemo!2026
```

如果登录失败，通常是数据库还没 reset，或 `.env.local` 里的 Supabase `Publishable` / anon key 没填对。

## 5. Demo 模式

如果 `.env.local` 没有配置：

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

前端会进入视觉 Demo 模式。

也可以手动打开：

```env
VITE_DEMO_MODE=true
```

Demo 模式适合只看 UI，不连接真实 Supabase 后端。

## 6. Edge Functions

供应商账号创建/管理依赖 Edge Functions：

```text
create-vendor
manage-vendor
```

本地运行前先设置 secrets：

```bash
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  ALLOWED_ORIGIN=http://localhost:5173
```

然后启动 functions：

```bash
npm run functions:serve
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 是服务端密钥，不能写成 `VITE_*`，也不能暴露给浏览器。

## 7. 常用命令

启动前端：

```bash
npm run dev
```

构建生产包：

```bash
npm run build
```

本地预览生产包：

```bash
npm run preview
```

跑前端测试：

```bash
npm run test
```

监听模式跑测试：

```bash
npm run test:watch
```

跑 lint + test + build：

```bash
npm run check
```

启动 Supabase：

```bash
npm run db:start
```

重置本地数据库：

```bash
npm run db:reset
```

停止 Supabase：

```bash
npm run db:stop
```

跑数据库测试：

```bash
npm run db:test
```

## 8. 推荐日常开发流程

每次开始开发：

```bash
cd /Users/dairui/Desktop/task_register
npm run db:start
npm run dev
```

如果数据库结构或 seed 数据需要重新加载：

```bash
npm run db:reset
```

如果要测试供应商管理功能：

```bash
npm run functions:serve
```

提交或交付前：

```bash
npm run check
```

## 9. 常见问题

### 页面进入 Demo 模式

原因通常是 `.env.local` 缺少：

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

解决：

```bash
npx supabase status
```

复制 `API URL` 和 `Publishable` / anon key 到 `.env.local`，然后重启：

```bash
npm run dev
```

### 登录失败

先确认 Supabase 已启动：

```bash
npx supabase status
```

再重置数据库：

```bash
npm run db:reset
```

使用 seed 账号登录：

```text
admin@ropedia.local / AdminDemo!2026
```

### Supabase 启动失败

常见原因是 Docker 没启动或端口被占用。

先确认 Docker Desktop 正在运行，然后检查端口：

```text
54321
54322
54323
54324
```

必要时停止 Supabase：

```bash
npm run db:stop
```

再重新启动：

```bash
npm run db:start
```

### macOS 提示工具无法验证或 Not Opened

如果启动 Supabase 或 Vite 时弹出：

```text
Apple could not verify "supabase"
Apple could not verify "rolldown-binding.darwin-arm64.node"
```

不要点 `Move to Bin`，先点 `Done`。然后在项目目录执行：

```bash
cd /Users/dairui/Desktop/task_register
xattr -dr com.apple.quarantine node_modules
```

再重新运行：

```bash
npm run db:start
npm run dev
```

如果仍然被拦截，打开：

```text
System Settings -> Privacy & Security
```

在页面底部找到被拦截的程序，点击 `Open Anyway`。

### Edge Function 调用失败

确认已经设置 secrets：

```bash
npx supabase secrets list
```

确认 functions 正在运行：

```bash
npm run functions:serve
```

本地前端默认 origin 是：

```text
http://localhost:5173
```

所以 `ALLOWED_ORIGIN` 要匹配它。

## 10. 生产部署简版

1. 创建或连接 Supabase 云端项目。
2. 执行数据库迁移：

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

3. 部署 Edge Functions：

```bash
npx supabase functions deploy create-vendor
npx supabase functions deploy manage-vendor
```

4. 在生产环境配置前端变量：

```env
VITE_SUPABASE_URL=<生产 Supabase URL>
VITE_SUPABASE_ANON_KEY=<生产 anon key>
VITE_DEMO_MODE=false
```

5. 设置生产 Edge Function secrets：

```bash
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<生产 service role key> \
  ALLOWED_ORIGIN=<生产前端域名>
```

6. 构建前端：

```bash
npm run build
```

7. 部署 `dist/` 到静态站点服务，并开启 SPA fallback。

## 11. 部署到 BCC / EC2 详细步骤

BCC 和 EC2 本质上都是云服务器。这个项目建议的生产形态是：

```text
浏览器
  -> BCC / EC2 上的 Nginx 静态站点
  -> Supabase 云端项目
```

也就是说，BCC / EC2 主要负责托管前端 `dist/`，Supabase PostgreSQL、Auth、Storage、Edge Functions 建议使用 Supabase 云端项目承载。

不建议直接把本地 Supabase Docker 当生产数据库长期跑在单台云服务器上，除非你明确要自维护数据库、备份、升级、安全和高可用。

### 11.1 准备 Supabase 生产项目

在本地项目目录执行：

```bash
cd /Users/dairui/Desktop/task_register
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

部署 Edge Functions：

```bash
npx supabase functions deploy create-vendor
npx supabase functions deploy manage-vendor
```

设置生产 secrets：

```bash
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<生产 service role key> \
  ALLOWED_ORIGIN=https://<你的生产域名>
```

如果暂时没有域名，用服务器公网 IP 测试，则先配置：

```bash
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<生产 service role key> \
  ALLOWED_ORIGIN=http://<服务器公网IP>
```

生产前端只允许使用 `Publishable` / anon key：

```env
VITE_SUPABASE_URL=<生产 Supabase Project URL>
VITE_SUPABASE_ANON_KEY=<生产 Supabase Publishable/anon key>
VITE_DEMO_MODE=false
```

不要把 `SUPABASE_SERVICE_ROLE_KEY` 写进任何 `VITE_*` 环境变量。

### 11.2 创建 BCC / EC2 服务器

推荐配置：

```text
系统: BCC 推荐 Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS；EC2 推荐 Ubuntu 22.04 / 24.04 或 Amazon Linux 2023
CPU: 2 vCPU 起
内存: 2 GB 起
磁盘: 20 GB 起
公网: 需要绑定公网 IP
带宽: 按预期访问量选择，测试阶段 1-5 Mbps 即可
```

安全组 / 防火墙放行：

```text
22/tcp   SSH，建议只允许你的办公 IP
80/tcp   HTTP
443/tcp  HTTPS
```

不要开放数据库端口给公网。

#### BCC 安全组放行方法

在百度智能云控制台操作：

```text
BCC 云服务器
  -> 实例
  -> 选择你的服务器
  -> 安全组
  -> 点击当前绑定的安全组
  -> 入站规则
  -> 添加规则
```

添加三条入站规则：

```text
协议: TCP
端口: 22
源地址: 你的办公公网 IP/32
说明: SSH
```

```text
协议: TCP
端口: 80
源地址: 0.0.0.0/0
说明: HTTP
```

```text
协议: TCP
端口: 443
源地址: 0.0.0.0/0
说明: HTTPS
```

如果暂时不知道自己的公网 IP，可以在本地电脑运行：

```bash
curl ifconfig.me
```

假设输出是：

```text
1.2.3.4
```

那么 SSH 规则源地址填：

```text
1.2.3.4/32
```

测试阶段如果 SSH 登录一直失败，可以临时把 `22/tcp` 源地址设为：

```text
0.0.0.0/0
```

但不建议长期这样开，确认能登录后应改回你的办公 IP。

#### EC2 Security Group 放行方法

在 AWS 控制台操作：

```text
EC2
  -> Instances
  -> 选择实例
  -> Security
  -> 点击 Security group
  -> Edit inbound rules
```

添加：

```text
Type: SSH
Protocol: TCP
Port: 22
Source: My IP
```

```text
Type: HTTP
Protocol: TCP
Port: 80
Source: 0.0.0.0/0
```

```text
Type: HTTPS
Protocol: TCP
Port: 443
Source: 0.0.0.0/0
```

#### 服务器系统防火墙

安全组是云平台层面的防火墙。服务器系统里还可能有自己的防火墙。

Ubuntu 如果启用了 UFW，可以这样放行：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status verbose
```

如果 UFW 没启用，通常不用额外处理：

```bash
sudo ufw status
```

输出 `inactive` 表示系统防火墙未启用。

最终判断链路是否打通：

```text
SSH 能登录 -> 22/tcp 正常
浏览器能打开 http://<公网IP> -> 80/tcp + Nginx 正常
浏览器能打开 https://<域名> -> 443/tcp + 证书正常
```

如果这台机器创建时配置了登录密钥，要保存好私钥文件。密钥只用于 SSH 登录服务器，不会让浏览器自动访问网站。

直接在浏览器里打开公网 IP 或公网链接没效果，通常是因为还没有完成以下条件：

```text
机器已绑定公网 IP
安全组已放行 80/443
Nginx 已启动
前端 dist 已部署到 Nginx root
Nginx 配置已 reload
```

所以刚创建完机器时，直接访问公网链接不一定有页面；这是正常的，需要先完成后续部署。

### 11.3 登录服务器

如果使用密钥登录，先在本地给私钥设置权限：

```bash
chmod 400 /path/to/key.pem
```

EC2 示例：

```bash
ssh -i /path/to/key.pem ubuntu@<EC2公网IP>
```

Amazon Linux 示例：

```bash
ssh -i /path/to/key.pem ec2-user@<EC2公网IP>
```

BCC 示例：

```bash
ssh -i /path/to/key.pem root@<BCC公网IP>
```

如果 BCC 镜像默认用户不是 `root`，尝试：

```bash
ssh -i /path/to/key.pem ubuntu@<BCC公网IP>
```

登录失败时重点检查：

```text
私钥是否对应这台机器
私钥权限是否是 400
安全组是否放行 22/tcp
22/tcp 是否只允许了错误的来源 IP
用户名是否正确，常见是 root / ubuntu / ec2-user
```

### 11.4 安装基础软件

Ubuntu：

```bash
sudo apt update
sudo apt install -y nginx git curl rsync
```

Amazon Linux：

```bash
sudo yum update -y
sudo yum install -y nginx git curl rsync
```

启动 Nginx：

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

浏览器访问：

```text
http://<服务器公网IP>
```

能看到 Nginx 默认页说明服务器和安全组基本正常。

如果仍然打不开：

```bash
systemctl status nginx
curl -I http://127.0.0.1
```

如果服务器本机 `curl` 能通，但你的浏览器打不开，优先检查 BCC / EC2 安全组的 `80/tcp` 是否对公网开放。

### 11.5 安装 Node.js

推荐用 nvm 安装 Node.js 22：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v
npm -v
```

如果 `source ~/.bashrc` 不生效，重新 SSH 登录一次服务器。

#### BCC 访问 GitHub raw 卡住时安装 Node.js

如果执行下面命令一直卡在 0%：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

说明服务器访问 GitHub raw 很慢或不可达。先按 `Ctrl+C` 取消，改用国内镜像安装 Node.js 二进制包。

先确认机器架构：

```bash
uname -m
```

如果输出是 `x86_64`，使用 `linux-x64`：

```bash
cd /tmp
NODE_VERSION=v22.13.1
NODE_DIST=node-${NODE_VERSION}-linux-x64

curl -fLO https://npmmirror.com/mirrors/node/${NODE_VERSION}/${NODE_DIST}.tar.xz
tar -xf ${NODE_DIST}.tar.xz

mkdir -p /usr/local/lib/nodejs
mv ${NODE_DIST} /usr/local/lib/nodejs/

ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/node /usr/local/bin/node
ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/npm /usr/local/bin/npm
ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/npx /usr/local/bin/npx

node -v
npm -v
npx -v
```

如果输出是 `aarch64`，使用 `linux-arm64`：

```bash
cd /tmp
NODE_VERSION=v22.13.1
NODE_DIST=node-${NODE_VERSION}-linux-arm64

curl -fLO https://npmmirror.com/mirrors/node/${NODE_VERSION}/${NODE_DIST}.tar.xz
tar -xf ${NODE_DIST}.tar.xz

mkdir -p /usr/local/lib/nodejs
mv ${NODE_DIST} /usr/local/lib/nodejs/

ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/node /usr/local/bin/node
ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/npm /usr/local/bin/npm
ln -sf /usr/local/lib/nodejs/${NODE_DIST}/bin/npx /usr/local/bin/npx

node -v
npm -v
npx -v
```

如果 `npm install` 也很慢，可以临时使用 npm 镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

### 11.6 上传或拉取代码

方式一：服务器直接拉代码：

```bash
cd /opt
sudo git clone <你的仓库地址> task_register
sudo chown -R "$USER":"$USER" /opt/task_register
cd /opt/task_register
```

方式二：本地打包上传：

```bash
rsync -az --delete \
  /Users/dairui/Desktop/task_register/ \
  <user>@<服务器IP>:/opt/task_register/
```

不要上传本地 `.env.local` 到生产服务器，生产环境单独写 `.env.production`。

### 11.7 配置生产环境变量

在服务器项目目录创建：

```bash
cd /opt/task_register
cat > .env.production <<'EOF'
VITE_SUPABASE_URL=<生产 Supabase Project URL>
VITE_SUPABASE_ANON_KEY=<生产 Supabase Publishable/anon key>
VITE_DEMO_MODE=false
EOF
```

注意：Vite 的 `VITE_*` 变量会在 `npm run build` 时写入前端产物。修改 `.env.production` 后必须重新 build。

### 11.8 构建前端

```bash
cd /opt/task_register
npm ci
npm run build
```

构建成功后会生成：

```text
/opt/task_register/dist/
```

可以先本地预览：

```bash
npm run preview -- --host 0.0.0.0
```

但生产建议由 Nginx 托管 `dist/`，不要长期用 `vite preview`。

### 11.9 部署 dist 到 Nginx

创建发布目录：

```bash
sudo mkdir -p /var/www/task_register/releases
RELEASE_DIR="/var/www/task_register/releases/$(date +%Y%m%d%H%M%S)"
sudo mkdir -p "$RELEASE_DIR"
sudo rsync -a --delete /opt/task_register/dist/ "$RELEASE_DIR/"
sudo ln -sfn "$RELEASE_DIR" /var/www/task_register/current
```

创建 Nginx 配置：

```bash
sudo tee /etc/nginx/conf.d/task_register.conf >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/task_register/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }
}
EOF
```

检查并重载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://<服务器公网IP>
```

如果打开后仍然是 Nginx 默认页，说明 Nginx 没有加载到 `task_register.conf`，检查：

```bash
nginx -T | grep -n "task_register" -A 20
```

如果浏览器显示 404 或刷新子路由 404，确认配置里有：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 11.10 配置域名和 HTTPS

如果有域名，例如：

```text
task-register.example.com
```

先在 DNS 服务商处添加 A 记录：

```text
task-register.example.com -> 服务器公网 IP
```

然后把 Nginx 的 `server_name` 改成：

```nginx
server_name task-register.example.com;
```

Ubuntu 安装 certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

申请 HTTPS 证书：

```bash
sudo certbot --nginx -d task-register.example.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

HTTPS 生效后，需要同步更新 Supabase secrets：

```bash
npx supabase secrets set ALLOWED_ORIGIN=https://task-register.example.com
```

### 11.11 更新部署

以后更新代码时，在服务器上执行：

```bash
cd /opt/task_register
git pull
npm ci
npm run build

RELEASE_DIR="/var/www/task_register/releases/$(date +%Y%m%d%H%M%S)"
sudo mkdir -p "$RELEASE_DIR"
sudo rsync -a --delete dist/ "$RELEASE_DIR/"
sudo ln -sfn "$RELEASE_DIR" /var/www/task_register/current
sudo nginx -t
sudo systemctl reload nginx
```

如果只是本地构建后上传，可以在本地执行：

```bash
cd /Users/dairui/Desktop/task_register
npm ci
npm run build
rsync -az --delete dist/ <user>@<服务器IP>:/tmp/task_register_dist/
```

再到服务器执行：

```bash
RELEASE_DIR="/var/www/task_register/releases/$(date +%Y%m%d%H%M%S)"
sudo mkdir -p "$RELEASE_DIR"
sudo rsync -a --delete /tmp/task_register_dist/ "$RELEASE_DIR/"
sudo ln -sfn "$RELEASE_DIR" /var/www/task_register/current
sudo nginx -t
sudo systemctl reload nginx
```

### 11.12 回滚

查看历史发布：

```bash
ls -lah /var/www/task_register/releases
```

把 `current` 指回上一个版本：

```bash
sudo ln -sfn /var/www/task_register/releases/<旧版本目录> /var/www/task_register/current
sudo systemctl reload nginx
```

### 11.13 BCC / EC2 差异点

部署流程基本一致，主要差异在云控制台：

```text
EC2: 配置 Security Group，放行 22/80/443
BCC: 配置安全组，放行 22/80/443
```

如果机器没有公网 IP，需要先绑定公网 IP 或 EIP。

如果服务器在私有子网后面，需要通过负载均衡或 NAT/网关方案对外提供 HTTP/HTTPS。

### 11.14 生产排查

查看 Nginx 状态：

```bash
sudo systemctl status nginx
```

查看 Nginx 错误日志：

```bash
sudo journalctl -u nginx --no-pager -n 100
sudo tail -n 100 /var/log/nginx/error.log
```

确认前端产物存在：

```bash
ls -lah /var/www/task_register/current
```

确认环境变量是否在构建前写好：

```bash
cd /opt/task_register
cat .env.production
```

如果页面打开后自动进入 Demo 模式，通常是构建时没有正确设置：

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

修复后重新构建和发布：

```bash
npm run build
sudo rsync -a --delete dist/ /var/www/task_register/current/
sudo systemctl reload nginx
```

如果登录或接口失败，检查：

```text
Supabase URL 是否是生产 URL
Publishable / anon key 是否来自同一个 Supabase 项目
Edge Function secrets 的 ALLOWED_ORIGIN 是否匹配生产域名
浏览器 Console / Network 里的具体错误
```

## 12. BCC 同机部署前端 + Supabase

如果 Supabase 和前端项目部署在同一台 BCC 上，架构会变成：

```text
浏览器
  -> BCC Nginx 80/443，访问前端 dist
  -> BCC Supabase API 54321，访问数据库/Auth/Storage/Functions
```

这个方案需要 Docker，因为 Supabase 本地服务依赖 Docker 容器。

注意：`127.0.0.1` 只能在服务器内部使用。前端代码运行在用户浏览器里，所以生产环境的 `VITE_SUPABASE_URL` 不能写 `127.0.0.1`，必须写浏览器能访问的公网地址。

### 12.1 安全组规划

最简单的测试配置：

```text
22/tcp     SSH，只允许你的办公 IP
80/tcp     前端 HTTP，允许 0.0.0.0/0
443/tcp    前端 HTTPS，允许 0.0.0.0/0
54321/tcp  Supabase API，允许 0.0.0.0/0
```

不要对公网开放：

```text
54322/tcp  Postgres 数据库
54323/tcp  Supabase Studio
54324/tcp  Inbucket 邮件服务
```

更推荐的生产配置是使用域名和 Nginx 反向代理：

```text
https://task-register.example.com      -> 前端
https://supabase.example.com           -> Supabase API 54321
```

这样安全组只需要公网开放：

```text
80/tcp
443/tcp
```

### 12.2 安装 Docker

如果只是先快速跑起来，Ubuntu 可以直接使用系统源安装 Docker：

```bash
apt update
apt install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
docker ps
```

如果 `docker-compose-plugin` 找不到，可以先安装 `docker.io`，Supabase CLI 主要需要 `docker` 命令可用：

```bash
apt update
apt install -y docker.io
systemctl enable docker
systemctl start docker
docker --version
docker ps
```

如果 `apt update` 报 Docker 官方源 GPG key 错误：

```text
NO_PUBKEY 7EA0A9C3F273FCD8
The repository 'https://download.docker.com/linux/ubuntu noble InRelease' is not signed.
```

说明 Docker 官方 apt 源配置坏了。可以先删掉这个源，直接使用 Ubuntu/BCC 源的 `docker.io`：

```bash
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.gpg

apt update
apt install -y docker.io

systemctl enable docker
systemctl start docker

docker --version
docker ps
```

更标准的 Docker 官方源安装方式如下。

Ubuntu：

```bash
apt update
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
docker compose version
```

如果 Docker 官方源访问慢，可以在 BCC 控制台或系统镜像里使用百度云/系统自带的软件源安装 Docker。安装完成后确认：

```bash
docker ps
```

### 12.3 在 BCC 上启动 Supabase

进入项目目录：

```bash
cd /opt/task_register
```

安装依赖：

```bash
npm ci
```

启动 Supabase Docker 服务：

```bash
npm run db:start
```

初始化数据库和 seed 数据：

```bash
npm run db:reset
```

查看 Supabase 状态：

```bash
npx supabase status
```

你会看到类似：

```text
Project URL: http://127.0.0.1:54321
Publishable: sb_publishable_...
Secret: sb_secret_...
Studio URL: http://127.0.0.1:54323
```

服务器内部看到的 `Project URL` 是 `127.0.0.1`，但是生产前端不能用这个值。

如果临时用公网 IP 暴露 Supabase API，则前端要写：

```env
VITE_SUPABASE_URL=http://<BCC公网IP>:54321
VITE_SUPABASE_ANON_KEY=<npx supabase status 输出的 Publishable>
VITE_DEMO_MODE=false
```

同时 BCC 安全组需要开放：

```text
54321/tcp
```

### 12.4 修改 Supabase Auth 回调地址

如果用公网 IP 测试，编辑：

```bash
vim /opt/task_register/supabase/config.toml
```

把：

```toml
[auth]
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://127.0.0.1:5173"]
```

改成：

```toml
[auth]
site_url = "http://<BCC公网IP>"
additional_redirect_urls = ["http://<BCC公网IP>"]
```

如果使用域名和 HTTPS，则改成：

```toml
[auth]
site_url = "https://task-register.example.com"
additional_redirect_urls = ["https://task-register.example.com"]
```

修改后重启 Supabase：

```bash
npm run db:stop
npm run db:start
npm run db:reset
```

### 12.5 设置 Edge Function secrets

本地同机 Supabase 的 functions 也需要 secrets：

```bash
cd /opt/task_register
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<npx supabase status 输出的 Secret> \
  ALLOWED_ORIGIN=http://<BCC公网IP>
```

如果使用 HTTPS 域名：

```bash
npx supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<npx supabase status 输出的 Secret> \
  ALLOWED_ORIGIN=https://task-register.example.com
```

启动 Edge Functions：

```bash
npm run functions:serve
```

测试时可以直接前台运行。长期运行建议用 systemd。

### 12.6 用 systemd 常驻 Edge Functions

创建服务文件：

```bash
cat > /etc/systemd/system/task-register-functions.service <<'EOF'
[Unit]
Description=Task Register Supabase Edge Functions
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/task_register
ExecStart=/usr/local/bin/npm run functions:serve
Restart=always
RestartSec=5
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF
```

启动：

```bash
systemctl daemon-reload
systemctl enable task-register-functions
systemctl start task-register-functions
systemctl status task-register-functions
```

查看日志：

```bash
journalctl -u task-register-functions -f
```

如果 `npm` 路径不是 `/usr/local/bin/npm`，先查：

```bash
which npm
```

然后修改 service 里的 `ExecStart`。

### 12.7 配置前端生产环境变量

如果临时用 IP + 54321：

```bash
cd /opt/task_register
cat > .env.production <<'EOF'
VITE_SUPABASE_URL=http://<BCC公网IP>:54321
VITE_SUPABASE_ANON_KEY=<npx supabase status 输出的 Publishable>
VITE_DEMO_MODE=false
EOF
```

如果用域名反代 Supabase API：

```bash
cat > .env.production <<'EOF'
VITE_SUPABASE_URL=https://supabase.example.com
VITE_SUPABASE_ANON_KEY=<npx supabase status 输出的 Publishable>
VITE_DEMO_MODE=false
EOF
```

然后重新构建前端：

```bash
npm run build
```

### 12.8 部署前端到 Nginx

```bash
RELEASE_DIR="/var/www/task_register/releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "$RELEASE_DIR"
rsync -a --delete /opt/task_register/dist/ "$RELEASE_DIR/"
ln -sfn "$RELEASE_DIR" /var/www/task_register/current
nginx -t
systemctl reload nginx
```

浏览器访问：

```text
http://<BCC公网IP>
```

### 12.9 可选：用 Nginx 给 Supabase API 配域名

如果有域名，建议不要对公网暴露 `54321`，而是反向代理到本机 Supabase API。

创建 Nginx 配置：

```bash
cat > /etc/nginx/conf.d/supabase_api.conf <<'EOF'
server {
    listen 80;
    server_name supabase.example.com;

    location / {
        proxy_pass http://127.0.0.1:54321;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

申请 HTTPS：

```bash
certbot --nginx -d supabase.example.com
```

然后前端 `.env.production` 使用：

```env
VITE_SUPABASE_URL=https://supabase.example.com
```

### 12.10 同机部署常见问题

前端页面打开但接口失败：

```text
检查 VITE_SUPABASE_URL 是否是浏览器可访问地址
不要写 http://127.0.0.1:54321
如果写 http://<公网IP>:54321，确认安全组放行 54321
如果写 https://supabase.example.com，确认 Nginx 反代和证书正常
```

登录跳转异常：

```text
检查 supabase/config.toml 的 site_url 和 additional_redirect_urls
检查 ALLOWED_ORIGIN 是否匹配前端地址
修改配置后重启 Supabase，并重新 build 前端
```

Supabase 起不来：

```bash
docker ps
npx supabase status
npm run db:stop
npm run db:start
```

查看 functions 日志：

```bash
journalctl -u task-register-functions -f
```

查看 Nginx 日志：

```bash
tail -n 100 /var/log/nginx/error.log
```

### 12.11 创建账号和赋权

本项目账号由 Supabase Auth 用户、`public.profiles` 角色记录，以及供应商账号对应的 `public.vendors` 记录共同组成。

先确认数据库容器名：

```bash
docker ps --format '{{.Names}}' | grep supabase_db
```

下面假设容器名是：

```text
supabase_db_task-register
```

创建 Admin 账号：

```bash
docker exec -i supabase_db_task-register psql -U postgres -d postgres <<'SQL'
\set email 'admin2@ropedia.local'
\set password 'AdminDemo!2026'
\set display_name 'Ropedia Admin 2'

with new_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    extensions.gen_random_uuid(),
    'authenticated',
    'authenticated',
    :'email',
    extensions.crypt(:'password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', :'display_name'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  returning id, email
),
new_identity as (
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  select
    id,
    id,
    email,
    jsonb_build_object('sub', id::text, 'email', email),
    'email',
    now(),
    now(),
    now()
  from new_user
)
insert into public.profiles (id, role, display_name, must_change_password)
select id, 'admin', :'display_name', false
from new_user;
SQL
```

创建 Vendor 账号：

```bash
docker exec -i supabase_db_task-register psql -U postgres -d postgres <<'SQL'
\set email 'vendor1@ropedia.local'
\set password 'VendorDemo!2026'
\set display_name 'Vendor 1'
\set company_name 'Vendor Company 1'
\set contact_name 'Vendor Contact 1'

with new_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    extensions.gen_random_uuid(),
    'authenticated',
    'authenticated',
    :'email',
    extensions.crypt(:'password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', :'display_name'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  returning id, email
),
new_identity as (
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  select
    id,
    id,
    email,
    jsonb_build_object('sub', id::text, 'email', email),
    'email',
    now(),
    now(),
    now()
  from new_user
),
new_profile as (
  insert into public.profiles (id, role, display_name, must_change_password)
  select id, 'vendor', :'display_name', false
  from new_user
  returning id
)
insert into public.vendors (
  profile_id, company_name, contact_name, contact_email, status
)
select id, :'company_name', :'contact_name', :'email', 'active'
from new_profile;
SQL
```

给已有账号赋 Admin 权限：

```bash
docker exec -i supabase_db_task-register psql -U postgres -d postgres <<'SQL'
update public.profiles
set role = 'admin', must_change_password = false
where id = (
  select id from auth.users where email = 'vendor1@ropedia.local'
);
SQL
```

查看账号和权限：

```bash
docker exec -i supabase_db_task-register psql -U postgres -d postgres -c "
select
  u.email,
  p.role,
  p.display_name,
  p.must_change_password,
  v.company_name,
  v.status
from auth.users u
left join public.profiles p on p.id = u.id
left join public.vendors v on v.profile_id = u.id
order by u.created_at desc;
"
```

如果后续执行 `npm run db:reset`，手动创建的账号会被重置掉。需要长期保留的账号，应该写入 `supabase/seed.sql`。
