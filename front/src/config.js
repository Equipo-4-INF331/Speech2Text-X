// front/src/config.js
const apiHost =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://3.140.245.161";

const config = {
  API_URL: apiHost,
};

export default config;

