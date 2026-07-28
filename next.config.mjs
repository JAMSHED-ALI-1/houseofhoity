/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.6", "192.168.2.173", "192.168.31.93",'192.168.1.2',"192.168.1.3"],
  async redirects() {
    return [
      {
        source: "/api/customer/activate/:id",
        destination: "/home/activate/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
