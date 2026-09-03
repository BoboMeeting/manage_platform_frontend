import type { NextConfig } from "next";

// 后端 .NET 服务地址（launch.json 中配置为 http://localhost:5080）。
// 浏览器始终同源访问 /api/*，由 Next 开发服务器代理转发到后端，
// 因此后端无需配置 CORS；生产环境由 Nginx 按前缀转发。
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  // 输出独立部署包：.next/standalone 内含最小化 node_modules，
  // 便于构建体积更小的 Docker 镜像。
  output: "standalone",
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
