import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills para jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock para URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
