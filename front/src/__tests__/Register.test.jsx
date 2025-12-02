/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../pages/Register';
import { useAuth } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    API_URL: 'http://localhost:5000/api',
  },
}));

describe('RegisterPage', () => {
  let registerMock;
  let loginMock;

  beforeEach(() => {
    registerMock = jest.fn().mockResolvedValue({});
    loginMock = jest.fn().mockResolvedValue({});

    useAuth.mockReturnValue({
      register: registerMock,
      login: loginMock,
    });

    mockNavigate.mockReset();
  });

  // ---------- caso feliz ----------
  it('registra, loguea y navega a "/" cuando todo sale bien', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const userInput = screen.getByLabelText(/usuario/i);
    const passInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /registrarse/i });

    // escribimos
    fireEvent.change(userInput, { target: { value: 'pepe' } });
    fireEvent.change(passInput, { target: { value: 'secreto' } });

    // enviamos form
    fireEvent.click(submitButton);

    // esperamos a que se resuelvan las promesas
    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith('pepe', 'secreto');
      expect(loginMock).toHaveBeenCalledWith('pepe', 'secreto');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // ---------- caso error en register ----------
  it('muestra el mensaje de error si register falla', async () => {
    // register falla, login ni siquiera debería llamarse
    registerMock.mockRejectedValueOnce({
      response: { data: { message: 'Usuario ya existe' } },
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const userInput = screen.getByLabelText(/usuario/i);
    const passInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /registrarse/i });

    fireEvent.change(userInput, { target: { value: 'pepe' } });
    fireEvent.change(passInput, { target: { value: 'secreto' } });
    fireEvent.click(submitButton);

    const errorMsg = await screen.findByText(/usuario ya existe/i);

    expect(errorMsg).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('deshabilita el botón mientras está cargando', async () => {
    // hacemos que register tarde un poco
    registerMock.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 10))
    );

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const userInput = screen.getByLabelText(/usuario/i);
    const passInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /registrarse/i });

    fireEvent.change(userInput, { target: { value: 'pepe' } });
    fireEvent.change(passInput, { target: { value: 'secreto' } });
    fireEvent.click(submitButton);

    // justo después de click debería estar disabled y mostrar "Creando cuenta..."
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/creando cuenta/i);

    // luego de que se resuelva, vuelve a habilitarse
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
