
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../pages/Login';
import { useAuth } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../context/AuthContext');

// mock simple de config
jest.mock('../config', () => ({
  __esModule: true,
  default: { API_URL: 'http://localhost:5000/api' },
}));

// mock de useNavigate y Link
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  };
});

describe('Login page', () => {
  let mockLogin;

  const setup = () => {
    mockLogin = jest.fn();

    useAuth.mockReturnValue({
      login: mockLogin,
    });

    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  it('hace login exitoso y navega al home', async () => {
    setup();

    mockLogin.mockResolvedValueOnce({}); // login OK

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: 'pepe' },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: '1234' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: /entrar/i })
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('pepe', '1234');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('muestra el mensaje específico del backend cuando err.response.data.message existe', async () => {
    setup();

    const backendError = {
      response: {
        data: { message: 'Credenciales inválidas' },
      },
    };
    mockLogin.mockRejectedValueOnce(backendError);

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: 'pepe' },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'mal' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: /entrar/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Credenciales inválidas')
      ).toBeInTheDocument();
    });

    // de paso cubrimos la clase de error
    const errorP = screen.getByText('Credenciales inválidas');
    expect(errorP.className).toContain('auth-error-text');
  });

  it('muestra el mensaje genérico cuando no hay err.response', async () => {
    setup();

    mockLogin.mockRejectedValueOnce(new Error('cualquier cosa'));

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: 'pepe' },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: '1234' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: /entrar/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Error al iniciar sesión')
      ).toBeInTheDocument();
    });
  });
});
