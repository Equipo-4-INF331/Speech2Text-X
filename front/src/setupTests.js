// setupTests.js
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills para jsdom (codificación de texto)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mocks de funciones del navegador no implementadas en jsdom
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'mocked-url');
}

if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = jest.fn();
}

// Evitar errores con elementos multimedia (<audio>, <video>)
Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn(),
});

Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
});
