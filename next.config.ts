import type { NextConfig } from "next";

// 后端 .NET 服务地址（launch.json 中配置为 http://localhost:5080）。
// 浏览器始终同源访问 /api/*，由 Next 开发服务器代理转发到后端，
// 因此后端无需配置 CORS；生产环境由 Nginx 按前缀转发。
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  // 输出独立部署包：.next/standalone 内含最小化 node_modules，
  // 便于构建体积更小的 Docker 镜像。
  output: "standalone",
  experimental: {
    // rewrites 代理默认只转发请求体前 10MB，视频上传会被截断导致后端 400；
    // 与后端 Kestrel/FormOptions 的 2GB 上限对齐。
    // 注意：Next 15.x 中该配置位于 experimental 下（顶层写法是 Next 16 的）。
    middlewareClientMaxBodySize: "2gb",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
