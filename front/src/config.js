// front/src/config.js
const apiHost =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://13.58.67.175";

const config = {
  API_URL: apiHost,
};

export default config;

