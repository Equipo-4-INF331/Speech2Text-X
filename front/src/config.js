// front/src/config.js
const apiHost =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://18.222.215.176";

const config = {
  API_URL: apiHost,
};

export default config;

