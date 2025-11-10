// front/src/config.js
const apiHost =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://3.129.57.133";

const config = {
  API_URL: apiHost,
};

export default config;

