import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills para jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
