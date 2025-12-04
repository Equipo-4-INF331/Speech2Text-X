// front/src/config.js
const isDevelopment = import.meta.env.DEV;
const isLocalhost = window.location.hostname === "localhost" ||
                   window.location.hostname === "127.0.0.1" ||
                   window.location.hostname.startsWith("192.168.") ||
                   window.location.hostname.startsWith("10.") ||
                   window.location.hostname.startsWith("172.");

const apiHost = isDevelopment && isLocalhost
  ? "http://localhost:5000"
  : "http://3.12.143.243";

const config = {
  API_URL: apiHost,
};

export default config;

